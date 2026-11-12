<div style="background-color: #f9fafb; color: #1f2937; width: 100%; padding: 1rem 0; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="background: white; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); padding: 2rem; width: 100%; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 1.4rem; margin: 0 0 1rem; text-align: center;">Parent Registration Request</h1>
        <p style="margin: 0 0 1rem;">Dear {{ $parentName }},</p>
        <p style="margin: 0 0 1rem; color: #4b5563;">
            Thank you for registering as a parent/guardian at Pilar College of Zamboanga City.
            After review, your registration request was not approved.
        </p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 0 0 1rem;">
            <div style="font-weight: bold; color: #991b1b; margin-bottom: 0.25rem;">Reason</div>
            <div style="color: #1f2937;">{!! strip_tags($reason, '<p><br><b><strong><i><em><ul><ol><li>') !!}</div>
        </div>
        <p style="margin: 0; color: #4b5563;">
            You may submit a new request once the concern above is addressed, or contact the
            Office of Student Affairs and Discipline for help.
        </p>
    </div>
</div>
