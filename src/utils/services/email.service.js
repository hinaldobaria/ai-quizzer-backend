// src/utils/services/email.service.js
const nodemailer = require('nodemailer');
const { generateImprovementSuggestions } = require('./ai.service');
const pool = require('../../db/connect');
const validator = require('validator');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SENDGRID_USERNAME || 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });

    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email server connection verified');
    } catch (error) {
      console.error('Email server connection failed:', error);
    }
  }

  async sendQuizResults(userEmail, submissionId, quizTitle, score, totalQuestions, incorrectAnswers = []) {
    if (!validator.isEmail(userEmail)) {
      console.error(`Invalid email address: ${userEmail}`);
      throw new Error('Invalid email address');
    }

    try {
      const suggestions = await this.generateSuggestions(quizTitle, score, totalQuestions, incorrectAnswers);
      const percentage = Math.round((score / totalQuestions) * 100);
      
      const mailOptions = this.buildEmailOptions(
        userEmail, 
        quizTitle, 
        score, 
        totalQuestions, 
        percentage, 
        incorrectAnswers, 
        suggestions
      );

      const info = await this.transporter.sendMail(mailOptions);
      await this.recordNotification(submissionId, true);
      
      console.log(`Email sent to ${userEmail} for submission ${submissionId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Failed to send email for submission ${submissionId}:`, error);
      await this.recordNotification(submissionId, false, error.message);
      throw error;
    }
  }

  async generateSuggestions(quizTitle, score, totalQuestions, incorrectAnswers) {
    if (incorrectAnswers.length > 0) {
      return await generateImprovementSuggestions({
        quiz: quizTitle,
        score,
        total: totalQuestions,
        weakAreas: incorrectAnswers.map(a => a.question)
      });
    }
    return "Great job! You answered all questions correctly. Keep up the good work!";
  }

  buildEmailOptions(userEmail, quizTitle, score, totalQuestions, percentage, incorrectAnswers, suggestions) {
    return {
      from: `"AI Quizzer" <${process.env.EMAIL_FROM}>`,
      to: userEmail,
      subject: `Your Quiz Results: ${quizTitle}`,
      text: this.buildTextEmail(quizTitle, score, totalQuestions, percentage, incorrectAnswers, suggestions),
      html: this.buildHtmlEmail(quizTitle, score, totalQuestions, percentage, incorrectAnswers, suggestions)
    };
  }

  buildTextEmail(quizTitle, score, totalQuestions, percentage, incorrectAnswers, suggestions) {
    let text = `Quiz: ${quizTitle}\n`;
    text += `Score: ${score}/${totalQuestions} (${percentage}%)\n\n`;
    
    if (incorrectAnswers.length > 0) {
      text += `Areas to Improve:\n`;
      text += incorrectAnswers.map(a => 
        `- ${a.question}\n  Your answer: ${a.userAnswer}\n  Correct answer: ${a.correctAnswer}` +
        (a.explanation ? `\n  Explanation: ${a.explanation}` : '')
      ).join('\n\n');
      text += '\n\n';
    }
    
    text += `Suggestions for Improvement:\n${suggestions}\n\n`;
    text += `Thank you for using AI Quizzer!`;
    
    return text;
  }

  buildHtmlEmail(quizTitle, score, totalQuestions, percentage, incorrectAnswers, suggestions) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
          Quiz Results
        </h1>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #3498db; margin-top: 0;">${quizTitle}</h2>
          
          <div style="background: #fff; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="font-size: 18px; margin: 0;">
              Your score: <strong>${score}/${totalQuestions}</strong> (${percentage}%)
            </p>
          </div>
          
          ${incorrectAnswers.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #e74c3c; margin-bottom: 10px;">Areas to Improve</h3>
            <ul style="padding-left: 20px;">
              ${incorrectAnswers.map(a => `
                <li style="margin-bottom: 15px;">
                  <p style="margin: 5px 0;"><strong>Question:</strong> ${a.question}</p>
                  <p style="margin: 5px 0; color: #e74c3c;">
                    <strong>Your answer:</strong> ${a.userAnswer}
                  </p>
                  <p style="margin: 5px 0; color: #27ae60;">
                    <strong>Correct answer:</strong> ${a.correctAnswer}
                  </p>
                  ${a.explanation ? `
                  <p style="margin: 5px 0; font-style: italic;">
                    <strong>Explanation:</strong> ${a.explanation}
                  </p>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          <div style="background: #e8f4fc; padding: 15px; border-radius: 5px;">
            <h3 style="color: #2980b9; margin-top: 0;">Suggestions for Improvement</h3>
            <div style="white-space: pre-line;">${suggestions}</div>
          </div>
        </div>
        
        <p style="text-align: center; color: #7f8c8d; font-size: 14px;">
          Thank you for using AI Quizzer!<br>
          <a href="${process.env.APP_URL}" style="color: #3498db;">Visit our platform</a>
        </p>
      </div>
    `;
  }

  async recordNotification(submissionId, success, errorMessage = null) {
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, submission_id, email_sent, sent_at, error_message)
         VALUES ((SELECT user_id FROM submissions WHERE id = $1), $1, $2, NOW(), $3)`,
        [submissionId, success, errorMessage]
      );
    } catch (dbError) {
      console.error('Failed to record notification:', dbError);
    }
  }
}

module.exports = new EmailService();