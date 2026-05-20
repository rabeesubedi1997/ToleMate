<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ $subject }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f3f4f6;
            margin: 0;
            padding: 0;
        }

        .wrapper {
            max-width: 560px;
            margin: 40px auto;
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, .08);
        }

        .header {
            background: #2563eb;
            padding: 28px 32px;
            text-align: center;
        }

        .header h1 {
            color: #fff;
            font-size: 22px;
            margin: 0;
            font-weight: 700;
        }

        .body {
            padding: 32px;
        }

        .body h2 {
            color: #111827;
            font-size: 18px;
            margin: 0 0 12px;
        }

        .body p {
            color: #4b5563;
            font-size: 15px;
            line-height: 1.6;
            margin: 0 0 20px;
        }

        .btn {
            display: inline-block;
            background: #2563eb;
            color: #fff !important;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
        }

        .footer {
            background: #f9fafb;
            padding: 20px 32px;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>

<body>
    <div class="wrapper">
        <div class="header">
            <h1>ToleMate</h1>
        </div>
        <div class="body">
            <p>Hi {{ $recipientName }},</p>
            <h2>{{ $heading }}</h2>
            <p>{{ $body }}</p>
            @if($actionUrl && $actionLabel)
            <p><a href="{{ $actionUrl }}" class="btn">{{ $actionLabel }}</a></p>
            @endif
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} ToleMate. You're receiving this email because you have an account with us.
        </div>
    </div>
</body>

</html>