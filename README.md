# Dock4 Everyone

# ROLE

You are a senior Full Stack Engineer, Product Designer, and UI/UX Designer.

Your task is to build a production-ready web application called **Dock**.

Dock is **not** a SaaS platform for creators. It is my **personal lead generation CRM and digital resource hub**. I will use it to organize, manage, and distribute my own free digital resources while collecting leads before granting access.

The application should feel like a premium product, comparable in quality to Linear, Arc Browser, Framer, Notion, Vercel, Gumroad, and Lemon Squeezy.

Do NOT generate a generic AI-looking website.

Avoid:

- Blue/purple/pink AI gradients

- Overused glowing effects

- Generic hero sections

- Cartoon illustrations

- Excessive glassmorphism

- Template-looking layouts

Instead, create a timeless, elegant, immersive experience with premium typography, clean spacing, subtle motion, and refined interactions.

# PROJECT

Name: Dock

Purpose:

Dock is my private platform where I upload and manage my own free lead magnets.

Visitors arrive from LinkedIn, Facebook, Instagram, Threads, Reddit, X, YouTube, or other platforms.

Before accessing any resource, visitors must submit their information.

After submitting the form, they immediately receive access to the requested resource.

Dock is only for me. It is not a marketplace and not a multi-user platform.

# MVP FEATURES

Build only these core features:

1. Landing page with lead capture flow.

2. Secure admin authentication.

3. Admin dashboard with complete resource management (Create, Edit, Delete).

4. Resource delivery after successful lead capture.

Do not build paid resources.

Do not build subscriptions.

Do not build creator accounts.

Do not build public user accounts.

# TECH STACK

Use:

- Next.js 15

- React

- TypeScript

- Tailwind CSS

- shadcn/ui

- Framer Motion

- React Hook Form

- Zod

- Prisma ORM

- PostgreSQL

- Better Auth or Auth.js

- UploadThing or Cloudinary

- Lucide Icons

Use reusable components.

Write production-ready code.

Follow clean architecture.

Everything must be fully responsive.

# DESIGN

The website should feel expensive.

Design inspiration:

- Linear

- Arc Browser

- Framer

- Notion

- Vercel

- Apple

- Gumroad

- Lemon Squeezy

Use:

- Elegant typography

- Clean layouts

- Perfect spacing

- Premium cards

- Soft shadows

- Minimal color palette

- Smooth motion

- High-quality UI

- Beautiful responsive layouts

The design should feel handcrafted.

Do not make it look AI-generated.

Animations should include:

- Fade in

- Slide up

- Stagger animations

- Hover elevation

- Smooth scrolling

- Sticky navigation

- Subtle parallax

- Micro interactions

- Page transitions

Motion should feel smooth and intentional.

# LANDING PAGE

Create an immersive landing page.

Navigation:

- Logo

- Resources

- About

- Contact

- Admin Login

Hero Section:

Headline:

"Free Resources. Better Learning."

Subheadline:

Discover carefully curated resources including PDFs, GitHub repositories, websites, AI tools, guides, templates, images, videos, and more.

Buttons:

- Explore Resources

- Learn More

Use an elegant visual composition instead of generic illustrations.

Featured Resources section:

Display resources as premium cards.

Each card contains:

- Thumbnail

- Title

- Short description

- Category

- Free badge

- Get Resource button

Never display raw URLs.

Never expose GitHub links.

Never expose Google Drive links.

Never expose website URLs.

Users should only see clean titles and buttons.

# RESOURCE FLOW

When a visitor clicks "Get Resource":

Open a lead capture modal or dedicated page.

Fields:

- Full Name (Required)

- Email (Required)

- Phone Number (Optional)

- Platform (Dropdown)

Platform options:

- LinkedIn

- Facebook

- Instagram

- Threads

- Reddit

- X

- YouTube

- Website

- Other

Validate the form.

After submission:

- Save lead into database.

- Associate lead with the selected resource.

- Save timestamp.

- Save IP address (if available).

- Save browser.

- Save device.

- Save selected platform.

Immediately unlock the requested resource.

Resource behavior:

PDF:

- Embedded viewer

- Download button

Image:

- Preview

- Download

Video:

- Embedded player

GitHub:

- Open repository in new tab

Google Drive:

- Open Drive link

Website:

- Open website in new tab

The real URLs must never be visible in the interface.

Only titles and buttons should be visible.

# RESOURCE TYPES

Support:

- PDF Upload

- Image Upload

- Video Upload

- GitHub URL

- Google Drive URL

- Website URL

Every resource includes:

- Title

- Description

- Thumbnail

- Category

- Resource Type

- File or URL

- Button Text

- Slug

- Status

- Created Date

# ADMIN

The admin area must be completely private.

No public access.

Authentication required.

Create a clean login page.

Login using:

- Email

- Password

Protect all admin routes.

Unauthenticated users must never access the dashboard.

# ADMIN DASHBOARD

Professional SaaS dashboard.

Sidebar:

- Dashboard

- Resources

- Leads

- Settings

- Logout

Dashboard overview:

- Total Resources

- Total Leads

- Today's Leads

- Recent Resources

- Recent Leads

The dashboard should feel like a premium internal CRM.

# RESOURCE MANAGEMENT

Admin can:

- Create Resource

- Edit Resource

- Delete Resource

- Publish Resource

- Unpublish Resource

Resource form fields:

- Title

- Description

- Category

- Thumbnail Upload

- Resource Type

- Button Text

- Slug

- Status

If Resource Type = PDF:

Show PDF upload field.

If Resource Type = Image:

Show image upload field.

If Resource Type = Video:

Show video upload field.

If Resource Type = GitHub:

Show GitHub URL field.

If Resource Type = Google Drive:

Show Google Drive URL field.

If Resource Type = Website:

Show website URL field.

The form should dynamically change based on resource type.

# LEADS

Store:

- Full Name

- Email

- Phone Number

- Platform

- Resource

- Timestamp

- IP Address

- Browser

- Device

Leads must never be publicly accessible.

# DATABASE

Create Prisma models:

- Admin

- Resource

- Lead

- Category

Use UUID IDs.

Create proper relationships.

# RESOURCE PAGE

Every resource has its own page:

/resource/[slug]

Display:

- Thumbnail

- Title

- Description

- Category

- Lead Capture

- Unlock Flow

Make it SEO-friendly.

# RESPONSIVENESS

Support:

- Desktop

- Tablet

- Mobile

Navigation becomes a mobile drawer.

Cards stack naturally.

Everything remains smooth and polished.

# COPYWRITING

Use professional, human-written copy.

Avoid Lorem Ipsum.

Avoid robotic AI wording.

Buttons:

- Get Resource

- Unlock Resource

- View PDF

- Download

- Open Repository

- Open Website

- Back to Resources

# CODE QUALITY

Write production-ready code.

Use reusable components.

Use server actions where appropriate.

Strong TypeScript typing.

No hardcoded data.

Keep the project modular and maintainable.

Comment important logic where necessary.

# FINAL GOAL

Build a premium personal lead generation platform that feels like a professionally funded startup product.

The frontend should provide an exceptional experience for visitors, while the backend should function as a secure and powerful personal CRM where I can manage all of my resources and captured leads without exposing any administrative functionality to the public.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dock4everyone.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4e85d6e1-3523-40a2-ba53-6585c44bb038).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
