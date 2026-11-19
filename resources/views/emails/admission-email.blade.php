<?php
$description = ($user_type == 'student') 
? 'Please show these approval to your instructor or program head to enter the class'
: "Please let {$student_name} to enter your class";
?>

<div style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #ccc; background-repeat: no-repeat; background-position: center; background-size: 200px;">
          <tr>
            <td style="padding: 20px; background-color: rgb(63, 63, 219); color: white; text-align: center;">
              <h2 style="margin: 0;">Admission Approved</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; color: #000;">
              <p>Dear {{ $sender_name }},</p>
              <p>{{ $student_name }} Admission Was Successfully Approved.</p>
              <p>{{ ucwords($description) }}</p>
              <p>Thank you for your patience.</p>
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
