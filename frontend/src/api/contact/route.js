import { NextResponse } from "next/server"

export async function POST(request) {
  try {
    const { name, email, subject, message } = await request.json()

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Here you can integrate with your email service
    // For example, using Resend, SendGrid, or Nodemailer

    // Example with a simple email service (you'll need to configure this)
    const emailData = {
      to: "info@2tume.com", // Your company email
      from: "noreply@2tume.com", // Your verified sender email
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">New Contact Form Submission</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="color: #1a202c; margin-top: 0;">Message:</h3>
            <p style="line-height: 1.6; color: #4a5568;">${message}</p>
          </div>
          <div style="margin-top: 20px; padding: 15px; background: #e0e7ff; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #3730a3;">
              This message was sent from the 2tume contact form.
            </p>
          </div>
        </div>
      `,
      text: `
        New Contact Form Submission
        
        Name: ${name}
        Email: ${email}
        Subject: ${subject}
        
        Message:
        ${message}
        
        This message was sent from the 2tume contact form.
      `,
    }

    // TODO: Replace this with your actual email service integration
    // Example integrations:

    // Using Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send(emailData)

    // Using SendGrid:
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // await sgMail.send(emailData)

    // For now, we'll simulate success
    console.log("Contact form submission:", { name, email, subject, message })

    return NextResponse.json({ message: "Email sent successfully" }, { status: 200 })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
