<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
    @include('pdf.partials.formal-body')
</head>
<body style="text-align: center;">
    <section class="doc-body">
        <div style="margin-bottom: 2rem;">
            <strong>Evidence/s of Complaint File Number</strong> {{ $case_number }}
        </div>
        <div>
            @foreach ($img_list as $src)
                <img src="{{ $src }}" width="500" alt="" style="display: block; margin: 20px auto; text-align: center; max-width: 80%; height: auto;">
            @endforeach
        </div>
    </section>
</body>
</html>