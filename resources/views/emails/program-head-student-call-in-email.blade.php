<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Notification from Prefect</title>
</head>
<body style="margin:0; padding:0; background-color:#f2f4f7; font-family:Arial, Helvetica, sans-serif;">

    <!-- Wrapper -->
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0; background-color:#f2f4f7;">
        <tr>
            <td align="center">

                <!-- Email Container -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:#1e40af; padding:20px; text-align:center;">
                            <h2 style="margin:0; color:#ffffff; font-size:22px;">
                                Call In Notification
                            </h2>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:30px; color:#333333;">

                            <!-- Greeting -->
                            <p style="margin:0 0 20px; font-size:15px;">
                                Dear <strong>{{ $program_head_name }}</strong>,
                            </p>

                            <!-- Intro -->
                            <p style="margin:0 0 20px; font-size:14px; line-height:1.6;">
                                This is to formally inform your office about your student that is being called in by the office of the prefect.
                                Please inform your student to visit to the office due to confidential reasons.
                            </p>

                            <!-- Student Details -->
                            <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; margin-bottom:20px;">
                                <tr>
                                    <td style="width:35%; color:#555555;"><strong>Student Name</strong></td>
                                    <td style="color:#111827;">{{ $student_name }}</td>
                                </tr>
                                <tr>
                                    <td style="color:#555555;"><strong>Program</strong></td>
                                    <td style="color:#111827;">{{ $program }}</td>
                                </tr>
                                <tr>
                                    <td style="color:#555555;"><strong>Date Reported</strong></td>
                                    <td style="color:#111827;">{{ $date_reported }}</td>
                                </tr>
                            </table>

                            @if($message)
                            <!-- Prefect's Message -->
                            <div style="margin-bottom:20px; padding:15px; background-color:#f9fafb; border-left:3px solid #1e40af; font-size:14px; line-height:1.6; color:#333333;">
                                {!! $message !!}
                            </div>
                            @endif

                            <!-- Divider -->
                            <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;">

                            <!-- Closing -->
                            <p style="margin-top:25px; font-size:14px;">
                                Kindly acknowledge this notification and advise on the next steps
                                to be undertaken.
                            </p>

                            <p style="margin:20px 0 0; font-size:14px;">
                                Respectfully,<br>
                                <strong>Office of the Prefect</strong><br>
                                Pilar College of Zamboanga City
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9fafb; padding:15px; text-align:center; font-size:12px; color:#6b7280;">
                            © 2025 Pilar College of Zamboanga City<br>
                            This is a system-generated email. Please do not reply.
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
