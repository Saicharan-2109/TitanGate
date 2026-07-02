const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create the Mailman (Transporter)
    // We tell the mailman to use Brevo's SMTP server and give him the keys from your Vault
    const transporter = nodemailer.createTransport({
        host: process.env.BREVO_SMTP_SERVER,
        port: 587,
        auth: {
            user: process.env.BREVO_SMTP_LOGIN,
            pass: process.env.BREVO_SMTP_PASSWORD
        }
    });

    // 2. Define the Letter (MailOptions)
    // We set who it's from, who it's going to, the subject, and the actual HTML design
    const mailOptions = {
        from: `TitanGate Tickets <saicharangoud2109@gmail.com>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments || []
    };

    // 3. Send the Mail!
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
