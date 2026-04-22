const Project = require('../models/Project');

// @desc    Create a project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const { projectName, about, domain } = req.body;

    const project = await Project.create({
      projectName,
      about,
      domain,
      leadId: req.user.id
    });

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
    if (project.leadId.toString() !== req.user.id) return res.status(401).json({ success: false, message: 'Not authorized' });

    if (req.body.projectName) project.projectName = req.body.projectName;
    if (req.body.about) project.about = req.body.about;
    if (req.body.isCompleted !== undefined) project.isCompleted = req.body.isCompleted;

    const updatedProject = await project.save();
    res.json({ success: true, data: updatedProject });
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
  deleteProject
};
