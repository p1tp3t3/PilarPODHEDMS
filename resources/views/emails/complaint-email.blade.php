<div style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0"
            style="background-color: #ffffff;
                   border: 1px solid #ccc;
                   background-repeat: no-repeat;
                   background-position: center;
                   background-size: 200px;">
            <tr>
              <td style="padding: 20px; background-color: #004085; color: white; text-align: center;">
                <h2 style="margin: 0;">Complaint Received</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px; color: #000;">
                <p>Dear {{ $complainant_name }},</p>
                <p>We are writing to inform you that your complaint against {{ $subject_name }} submitted on <strong>{{ date }}</strong> has been <strong>reviewed and approved</strong> by our office.</p>
                <p>Your concern is now being acted upon in accordance with institutional procedures. If further action or clarification is needed, our office will contact you directly.</p>
                <p>Thank you for your cooperation and for bringing this matter to our attention.</p>
              </td>
            </tr>
            <tr>
                <td style="padding: 20px; color: #000;">
                    <p style="margin-bottom:0; font-size:16px; line-height:1.6;">
                        Best regards,<br>
                        <strong>{{ $prefect_name }}</strong><br>
                    </p>
                </td>
            </tr>
            <tr>
              <td style="padding: 15px; background-color: #f8f9fa; text-align: center; font-size: 12px; color: #000;">
                Pilar College of Zamboanga City – Prefect of Discipline
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
</div>
