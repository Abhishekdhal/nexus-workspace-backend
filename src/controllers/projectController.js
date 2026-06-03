const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadBuffer } = require('../utils/cloudinary');
const { sendPushNotification, sendPushToTopic } = require('../utils/pushNotification');
const sendEmail = require('../utils/sendEmail');

// @desc    Create a project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const { projectName, about, domain, deadline, githubLink, documentationLink, deployedLink, projectLogoUrl } = req.body;

    const project = await Project.create({
      projectName,
      about,
      domain,
      deadline,
      leadId: req.user.id,
      githubLink: githubLink || '',
      documentationLink: documentationLink || '',
      deployedLink: deployedLink || '',
      projectLogoUrl: projectLogoUrl || ''
    });

    // Send push notifications and save to history
    try {
      const leadUser = await User.findById(req.user.id);
      const leadName = leadUser ? leadUser.name : 'Unknown';

      const title = 'New Project Created 📁';
      const body = `New project "${projectName}" created under lead "${leadName}".`;

      // 1. Save to database history
      await Notification.create({
        title,
        message: body,
        type: 'broadcast'
      });

      // 2. Send via topic to all users
      await sendPushToTopic('all_users', title, body);

      // 3. Send direct push to all users with tokens
      const users = await User.find({ fcmToken: { $ne: '' } });
      const tokens = users.map(u => u.fcmToken);
      if (tokens.length > 0) {
        await sendPushNotification(tokens, title, body);
      }
    } catch (pushErr) {
      console.error('Error sending project creation push notifications:', pushErr.message);
    }

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all projects (optionally filter by isCompleted)
// @route   GET /api/projects
// @access  Public (or Private depending on needs)
const getProjects = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isCompleted !== undefined) {
      filter.isCompleted = req.query.isCompleted === 'true';
    }

    const projects = await Project.find(filter)
      .populate('leadId', 'name email domain')
      .populate('members', 'name email domain')
      .populate('joinRequests', 'name email domain')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request to join a project
// @route   POST /api/projects/:id/request-join
// @access  Private
const requestJoin = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.isCompleted) {
      return res.status(400).json({ success: false, message: 'Cannot join a completed project' });
    }

    // Check if user is already a member or lead
    if (project.leadId.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'You are already the lead of this project' });
    }

    if (project.members.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You are already a member' });
    }

    // Check if request already sent
    if (project.joinRequests.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Join request already sent' });
    }

    project.joinRequests.push(req.user.id);
    await project.save();

    res.json({
      success: true,
      message: 'Join request sent successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Accept join request
// @route   POST /api/projects/:id/accept-request
// @access  Private
const acceptRequest = async (req, res) => {
  try {
    const { userId } = req.body; // Expecting the userId of the person to accept
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only leadId can accept requests
    if (project.leadId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to accept requests for this project' });
    }

    // Check if user is in joinRequests
    if (!project.joinRequests.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User has not requested to join' });
    }

    // Move from joinRequests to members
    project.joinRequests = project.joinRequests.filter(id => id.toString() !== userId);
    project.members.push(userId);

    await project.save();

    res.json({
      success: true,
      message: 'Request accepted successfully',
      data: project
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only leadId or admin can delete
    if (project.leadId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this project' });
    }

    await project.deleteOne();

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject join request
// @route   POST /api/projects/:id/reject-request
// @access  Private
const rejectRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.leadId.toString() !== req.user.id) return res.status(401).json({ success: false, message: 'Not authorized' });

    project.joinRequests = project.joinRequests.filter(id => id.toString() !== userId);
    await project.save();

    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a project (e.g., mark as completed, update title/about)
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isLead = project.leadId.toString() === req.user.id;
    const isMember = project.members.includes(req.user.id);

    if (!isLead && !isMember) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (req.body.projectName) {
      if (!isLead) return res.status(401).json({ success: false, message: 'Only lead can update project name' });
      project.projectName = req.body.projectName;
    }
    
    if (req.body.isCompleted !== undefined) {
      if (!isLead) return res.status(401).json({ success: false, message: 'Only lead can mark project complete' });
      project.isCompleted = req.body.isCompleted;
    }

    // Both lead and members can update about and links
    if (req.body.about) {
      project.about = req.body.about;
    }

    if (req.body.githubLink !== undefined) {
      project.githubLink = req.body.githubLink;
    }

    if (req.body.documentationLink !== undefined) {
      project.documentationLink = req.body.documentationLink;
    }

    if (req.body.deployedLink !== undefined) {
      project.deployedLink = req.body.deployedLink;
    }

    if (req.body.projectLogoUrl !== undefined) {
      project.projectLogoUrl = req.body.projectLogoUrl;
    }

    const updatedProject = await project.save();
    res.json({ success: true, data: updatedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request deadline extension
// @route   POST /api/projects/:id/extension-request
// @access  Private
const requestExtension = async (req, res) => {
  try {
    const { requestedDate, reason } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.leadId.toString() !== req.user.id) return res.status(401).json({ success: false, message: 'Only the project lead can request an extension' });
    if (project.isCompleted) return res.status(400).json({ success: false, message: 'Cannot extend a completed project' });

    project.extensionRequest = {
      requestedDate,
      reason,
      status: 'pending'
    };

    const updatedProject = await project.save();

    // Send push notification to all admins
    try {
      const admins = await User.find({ role: 'admin', fcmToken: { $ne: '' } });
      const adminTokens = admins.map(a => a.fcmToken);
      if (adminTokens.length > 0) {
        const formattedDate = new Date(requestedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        await sendPushNotification(
          adminTokens,
          '⏰ Extension Request',
          `Lead of "${project.projectName}" requested extension till ${formattedDate}.`
        );
      }
    } catch (pushErr) {
      console.error('Error sending extension request notification:', pushErr.message);
    }

    res.json({ success: true, data: updatedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Review deadline extension (Accept/Reject)
// @route   PUT /api/projects/:id/extension-review
// @access  Private (Admin only)
const reviewExtension = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (req.user.role !== 'admin') return res.status(401).json({ success: false, message: 'Only admins can review extensions' });

    if (!project.extensionRequest || project.extensionRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending extension request found' });
    }

    if (status === 'accepted') {
      project.deadline = project.extensionRequest.requestedDate;
      project.extensionRequest.status = 'accepted';
    } else if (status === 'rejected') {
      project.extensionRequest.status = 'rejected';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updatedProject = await project.save();

    // Send push notification to project lead and members
    try {
      const recipientIds = [project.leadId, ...(project.members || [])].filter(Boolean);
      const recipients = await User.find({ _id: { $in: recipientIds }, fcmToken: { $ne: '' } });
      const recipientTokens = recipients.map(u => u.fcmToken);
      
      if (recipientTokens.length > 0) {
        await sendPushNotification(
          recipientTokens,
          `Extension Request ${status === 'accepted' ? 'Approved' : 'Rejected'}`,
          `Your extension request for project "${project.projectName}" has been ${status === 'accepted' ? 'accepted' : 'rejected'}.`
        );
      }
    } catch (pushErr) {
      console.error('Error sending extension review notification:', pushErr.message);
    }

    res.json({ success: true, data: updatedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    // Upload buffer to Cloudinary
    const result = await uploadBuffer(req.file.buffer, 'nexus_projects');

    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const checkDeadlinesAndSendReminders = async () => {
  try {
    const now = new Date();
    
    // We want to find projects where the deadline is in exactly 2 days.
    const targetStart = new Date();
    targetStart.setDate(now.getDate() + 2);
    targetStart.setHours(0, 0, 0, 0);

    const targetEnd = new Date();
    targetEnd.setDate(now.getDate() + 2);
    targetEnd.setHours(23, 59, 59, 999);

    const projects = await Project.find({
      isCompleted: false,
      deadline: {
        $gte: targetStart,
        $lte: targetEnd
      }
    });

    console.log(`[Cron] Checking deadlines: found ${projects.length} projects ending in 2 days.`);

    for (const project of projects) {
      const recipientIds = [project.leadId, ...(project.members || [])].filter(Boolean);
      const recipients = await User.find({ _id: { $in: recipientIds } });
      
      // Send push notification
      const fcmTokens = recipients.map(u => u.fcmToken).filter(t => t && t.trim() !== '');
      if (fcmTokens.length > 0) {
        await sendPushNotification(
          fcmTokens,
          '⏰ Project Deadline Reminder',
          `Your project "${project.projectName}" is ending in 2 days (on ${new Date(project.deadline).toLocaleDateString()}). Please complete it or request an extension.`
        );
      }

      // Send email notification
      const emails = recipients.map(u => u.email).filter(Boolean);
      for (const email of emails) {
        const html = `
          <h2>Deadline Reminder: ${project.projectName}</h2>
          <p>Your project <strong>${project.projectName}</strong> is due in 2 days on <strong>${new Date(project.deadline).toLocaleDateString()}</strong>.</p>
          <p>Please complete it or request a deadline extension through the app.</p>
          <br/>
          <p>Regards,<br/>Nexus Workspace Team</p>
        `;
        try {
          await sendEmail({
            email,
            subject: `⏰ Deadline Reminder: ${project.projectName}`,
            html
          });
          console.log(`Sent deadline reminder email to ${email}`);
        } catch (emailErr) {
          console.error(`Failed to send email to ${email}:`, emailErr.message);
        }
      }
    }
  } catch (error) {
    console.error('Error running daily deadline check:', error);
  }
};

const cronDeadlineReminder = async (req, res) => {
  try {
    await checkDeadlinesAndSendReminders();
    res.json({ success: true, message: 'Cron job executed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  requestJoin,
  acceptRequest,
  rejectRequest,
  updateProject,
  deleteProject,
  requestExtension,
  reviewExtension,
  uploadLogo,
  checkDeadlinesAndSendReminders,
  cronDeadlineReminder
};
