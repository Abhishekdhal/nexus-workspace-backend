const User = require('../models/User');
const mongoose = require('mongoose');

const getWebProfile = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).send('<h1>Not Found</h1>');
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send('<h1>User not found</h1>');
    }

    // Default values
    const profilePhoto = user.profilePhotoUrl || 'https://via.placeholder.com/150';
    const role = user.role === 'admin' ? 'Admin' : 'Member';
    const domain = user.domain || 'Member';
    const name = user.name || 'Nexus Member';
    const email = user.email || '';
    const gmail = user.gmail || '';
    const github = user.github || '';
    const linkedin = user.linkedin || '';
    const streak = user.streakCount || 0;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - KIIT NEXUS</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Poppins', sans-serif;
        }

        body {
            background-color: #0b0f19;
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }

        .card {
            background: linear-gradient(180deg, #1e293b 0%, #0b0f19 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            width: 100%;
            max-width: 400px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 1px;
            color: #a0aec0;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #48bb78;
            border-radius: 50%;
            box-shadow: 0 0 10px #48bb78;
        }

        .profile-image-container {
            width: 100%;
            border-radius: 16px;
            overflow: hidden;
            margin-bottom: 20px;
            border: 2px solid #ecc94b;
        }

        .profile-image {
            width: 100%;
            height: auto;
            display: block;
        }

        .name {
            font-size: 32px;
            font-weight: 700;
            text-transform: uppercase;
            line-height: 1.1;
            margin-bottom: 8px;
        }

        .role-domain {
            font-size: 16px;
            color: #a0aec0;
            margin-bottom: 20px;
        }

        .domain-highlight {
            color: #ecc94b;
            font-weight: 600;
        }

        .active-member-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(236, 201, 75, 0.1);
            border: 1px solid #ecc94b;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: #ecc94b;
            margin-bottom: 30px;
        }

        .section-title {
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 1.5px;
            color: #a0aec0;
            text-transform: uppercase;
            margin-bottom: 12px;
        }

        .info-box {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 20px;
        }

        .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #ffffff;
        }

        .connect-links {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .connect-link {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(255, 255, 255, 0.05);
            padding: 16px;
            border-radius: 16px;
            text-decoration: none;
            color: #ffffff;
            transition: all 0.3s ease;
        }

        .connect-link:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .connect-icon {
            color: #ecc94b;
            font-size: 20px;
        }
        
        .footer-text {
            margin-top: 40px;
            text-align: left;
        }
        
        .footer-text span {
            display: block;
            font-size: 36px;
            font-weight: 800;
            color: rgba(255,255,255,0.2);
            line-height: 1;
            text-transform: uppercase;
        }
        .footer-text .highlight {
            color: #ecc94b;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="status">
                <div class="status-dot"></div>
                VERIFIED MEMBER ACCESS
            </div>
        </div>

        <div class="profile-image-container">
            <img src="${profilePhoto}" alt="${name}" class="profile-image">
        </div>

        <div class="name">${name.replace(' ', '<br>')}</div>
        <div class="role-domain">
            ${role}<br>
            <span class="domain-highlight">${domain}</span>
        </div>

        <div class="active-member-badge">
            <span>&#10003;</span> ACTIVE NEXUS MEMBER
        </div>

        <div class="section-title">EMAIL</div>
        <div class="info-box">
            <div class="info-value">${email}</div>
        </div>
        
        ${gmail ? \`
        <div class="section-title">GMAIL</div>
        <div class="info-box">
            <div class="info-value">${gmail}</div>
        </div>\` : ''}

        <div class="section-title">CONNECT</div>
        <div class="connect-links">
            ${github ? \`
            <a href="\${github.startsWith('http') ? github : 'https://github.com/' + github}" class="connect-link" target="_blank">
                <span class="connect-icon">&#128187;</span>
                GitHub
            </a>\` : ''}
            
            ${linkedin ? \`
            <a href="\${linkedin.startsWith('http') ? linkedin : 'https://linkedin.com/in/' + linkedin}" class="connect-link" target="_blank">
                <span class="connect-icon">&#128188;</span>
                LinkedIn
            </a>\` : ''}
        </div>
        
        <div class="footer-text">
            <span>WHERE</span>
            <span class="highlight">IDENTITY</span>
            <span>MEETS IMPACT</span>
        </div>
    </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

module.exports = { getWebProfile };
