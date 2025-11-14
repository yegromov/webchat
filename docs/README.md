# WebChat Documentation

Welcome to the WebChat documentation! This directory contains comprehensive guides for users and administrators.

## Documentation Index

### 📘 [User Guide](USER_GUIDE.md)
**For end users of the WebChat application**

Learn how to:
- Create and manage your profile
- Join chat rooms and send messages
- Start private direct messages
- Block unwanted users
- Choose between anonymous and registered accounts

**Perfect for:** New users, anyone needing help with WebChat features

---

### 🔧 [Administrator Guide](ADMIN_GUIDE.md)
**For system administrators and chat moderators**

Comprehensive coverage of:
- System architecture and components
- Database management and queries
- User management and moderation
- Monitoring, logging, and troubleshooting
- Security best practices
- Backup and recovery procedures
- Scaling and performance optimization

**Perfect for:** Admins, DevOps engineers, technical support staff

---

### 🚀 [Deployment Guide](DEPLOYMENT.md)
**For deploying WebChat to production**

Step-by-step instructions for:
- Docker deployment (recommended)
- Traditional server setup
- Cloud platform deployments (AWS, GCP, Heroku, DigitalOcean)
- SSL/TLS configuration
- Post-deployment verification
- Troubleshooting deployment issues

**Perfect for:** DevOps teams, system administrators deploying WebChat

---

## Quick Links

### For Users
- [Getting Started](USER_GUIDE.md#getting-started)
- [Creating Your Profile](USER_GUIDE.md#creating-your-profile)
- [Sending Direct Messages](USER_GUIDE.md#direct-messages)
- [Blocking Users](USER_GUIDE.md#blocking-users)

### For Administrators
- [Installation](ADMIN_GUIDE.md#installation--deployment)
- [Database Queries](ADMIN_GUIDE.md#common-queries)
- [Monitoring](ADMIN_GUIDE.md#monitoring--logs)
- [Security](ADMIN_GUIDE.md#security)

### For Deployment
- [Docker Quick Start](DEPLOYMENT.md#quick-deploy)
- [Production Setup](DEPLOYMENT.md#production-deployment)
- [SSL Configuration](DEPLOYMENT.md#ssltls-configuration)
- [Cloud Platforms](DEPLOYMENT.md#cloud-platforms)

---

## Technology Stack

WebChat is built with:

**Frontend:**
- React 18
- TypeScript
- Vite
- Zustand (state management)
- Tailwind CSS

**Backend:**
- Node.js 25+
- Fastify (web framework)
- WebSocket (real-time communication)
- PostgreSQL (database)
- Redis (pub/sub)
- Prisma (ORM)

---

## Features

- ✅ Real-time chat rooms
- ✅ Private direct messaging
- ✅ User profiles (username, age, sex, country)
- ✅ Optional user registration
- ✅ User blocking for privacy
- ✅ Online user presence
- ✅ Color-coded usernames (pink/blue by gender)
- ✅ XSS protection
- ✅ Horizontal scaling support
- ✅ Mobile-friendly

---

## Support

### Getting Help

1. **Users:** Check the [User Guide](USER_GUIDE.md) or [FAQ](USER_GUIDE.md#frequently-asked-questions)
2. **Admins:** Review the [Admin Guide](ADMIN_GUIDE.md) and [Troubleshooting](ADMIN_GUIDE.md#troubleshooting)
3. **Deployment Issues:** See [Deployment Troubleshooting](DEPLOYMENT.md#troubleshooting-deployment)

### Reporting Issues

Found a bug or have a suggestion?
- Check existing GitHub issues
- Create a new issue with details
- Contact the development team

---

## Contributing

We welcome contributions! If you'd like to improve the documentation:

1. Fork the repository
2. Make your changes
3. Submit a pull request
4. Clearly describe your improvements

---

## Version Information

- **WebChat Version:** 1.0.0
- **Documentation Last Updated:** November 2025
- **Supported Node.js:** 25+
- **Supported PostgreSQL:** 14+
- **Supported Redis:** 7+

---

## License

WebChat is open-source software. Please refer to the LICENSE file in the root directory for licensing information.

---

## Acknowledgments

Built with modern web technologies and best practices for real-time communication.

For more information, visit the [GitHub repository](https://github.com/your-org/webchat).

---

**Happy Chatting!** 💬
