<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Action Log Report</title>
  <style>
    :root{
      --brand:#0b5ed7;
      --muted:#666;
      --paper:#fff;
      --bg:#f4f6f8;
      --card-radius:8px;
    }
    html,body{
      height:100%;
      margin:0;
      color:#222;
    }

    .page {
      max-width:900px;
      margin:28px auto;
      padding:28px;
    }

    header {
      display:flex;
      gap:16px;
      align-items:center;
      margin-bottom:16px;
    }
    .logo {
      width:84px;
      height:84px;
      background:linear-gradient(135deg,var(--brand),#3aa0ff);
      border-radius:8px;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-weight:700;
      font-size:14px;
    }

    .org {
      line-height:1.08;
    }
    .org h1{
      margin:0;
      font-size:18px;
      letter-spacing:0.2px;
    }
    .org p{
      margin:0;
      font-size:13px;
    }

    .report-title {
      text-align:center;
      margin:18px 0 22px;
    }
    .report-title h2 {
      margin:0;
      font-size:20px;
      color:#123a7a;
    }
    .report-title .subtitle {
      color:var(--muted);
      font-size:13px;
      margin-top:6px;
    }

    /* Info block */
    .meta {
      display:flex;
      gap:12px;
      flex-wrap:wrap;
      margin-bottom:18px;
    }
    .meta .item {
      background:#fbfbff;
      padding:10px 12px;
      border-radius:6px;
      border:1px solid #eef2ff;
      min-width:160px;
      font-size:13px;
    }
    .meta .item span.label { color:var(--muted); display:block; font-size:12px; }
    .meta .item span.value { display:block; font-weight:600; margin-top:4px; color:#222; }

     header {
        text-align: center;
        margin-bottom: 30px;
    }

    header h1 {
            margin: 5px 0;
            font-size: 24px;
            color: #333;
        }

        header p {
            margin: 0;
            font-size: 14px;
            color: #666;
        }

    /* Table styles */
    table {
      width:100%;
      border-collapse:collapse;
      margin-top:8px;
      font-size:14px;
      border: 1px solid black;
    }
    thead th {
      padding:10px 12px;
      text-align:left;
      font-weight:600;
      font-size:13px;
      border: 1px solid black;
    }
    tbody td {
      padding:10px 12px;
      border: 1px solid black;
      vertical-align:top;
    }
    tbody tr:nth-child(even){ background:#fbfbfc; }

    .small { font-size:12px; color:var(--muted); }

    /* Footer / signature */
    .footer {
      margin-top:22px;
      display:flex;
      gap:18px;
      align-items:flex-start;
    }
    .sig {
      flex:1;
      text-align:left;
    }
    .sig .line {
      height:1px;
      background:#ddd;
      width:220px;
      margin-bottom:6px;
    }
    .sig p { margin:0; font-size:13px; color:var(--muted); }

    /* Buttons (not printed) */
    .controls { margin-bottom:16px; display:flex; gap:8px; }
    .btn {
      border:0;
      background:var(--brand);
      color:white;
      padding:8px 12px;
      border-radius:6px;
      cursor:pointer;
      font-size:14px;
    }
    .btn.secondary { background:#6c757d; }

    @media print {
      body { background: #fff; }
      .page { box-shadow:none; margin:0; border-radius:0; }
      .controls, .btn { display:none; }
    }
  </style>
</head>
<body>

  <main class="page" role="main" aria-label="Incident report">
    <header>
        <img src="{{ public_path('default-pic/pilar.png') }}" width="90" alt="">
        <h1>Pilar College of Zamboanga City, Inc.</h1>
        <p>R.T. Lim Boulevard, Zamboanga City</p>
        <p>Higher Education</p>
    </header>

    <section class="report-title" aria-labelledby="reportTitle">
      <h2>Action Log Report</h2>
      <div style="font-size: 11px; color: #555;">
        <strong>{{ $period }}</strong>
      </div>
    </section>

    <table role="table" aria-label="Incident details">
      <thead>
        <tr>
          <th> # </th>
          <th>User ID</th>
          <th>Name</th>
          <th>Role</th>
          <th>Action Type</th>
          <th>Details</th>
          <th>Date / time</th>
        </tr>
      </thead>
      <tbody>
        @foreach ($data as $d)
            <tr>
                <td>{{ $d['i'] }}</td>
                <td>{{ $d['user_id'] }}</td>
                <td>{{ $d['name'] }}</td>
                <td>{{ $d['role'] }}</td>
                <td>{{ $d['action_type'] }}</td>
                <td>{{ $d['details'] }}</td>
                <td>{{ $d['date_time'] }}</td>
            </tr>
        @endforeach
      </tbody>
    </table>
  </main>
</body>
</html>
