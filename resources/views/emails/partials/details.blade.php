{{--
    A record's details in the formal email: label / value rows.
    $rows: label => value (null / empty values are left out). Values are escaped.
--}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 18px; border-collapse:collapse; border-top:1px solid #d9dde3; font-family:Arial, Helvetica, sans-serif;">
    @foreach ($rows as $label => $value)
        @continue($value === null || $value === '')
        <tr>
            <td width="38%" valign="top" style="padding:9px 12px 9px 0; border-bottom:1px solid #e5e7eb; font-size:12.5px; color:#000; text-transform:uppercase; letter-spacing:0.4px;">{{ $label }}</td>
            <td valign="top" style="padding:9px 0; border-bottom:1px solid #e5e7eb; font-size:14px; color:#000; font-weight:bold; text-align:left;">{{ $value }}</td>
        </tr>
    @endforeach
</table>
