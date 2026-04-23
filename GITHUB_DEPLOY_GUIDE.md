
# GitHub Deployment Guide

This guide will help you deploy your Hostinger Horizons project to GitHub step by step.

---

## 📋 Prerequisites

Before you begin, make sure you have:

1. **GitHub Account**: Create a free account at [github.com](https://github.com) if you don't have one
2. **GitHub Repository**: Create a new repository for your project
   - Go to GitHub → Click "+" → "New repository"
   - Choose a repository name (e.g., `my-horizons-app`)
   - You can make it public or private
   - Don't initialize with README (we'll push existing code)
3. **Personal Access Token (PAT)**: Required for authentication
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a descriptive name (e.g., "Hostinger Horizons Deploy")
   - Set expiration (recommend 90 days or custom)
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token" and **copy it immediately** (you won't see it again!)

---

## 🔗 Connecting GitHub to Horizons

### Step 1: Configure Git in Horizons

Open the integrated terminal in Horizons and run:

