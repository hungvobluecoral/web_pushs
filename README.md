# Webpush for Notification

Webpush is a technology that allows web applications to send re-engageable notifications to users even when the browser is closed. It's a powerful feature for keeping users informed and engaged with your service.

## Prerequisites

To implement Webpush notifications, you'll typically need:

*   **Node.js and npm**: For the backend server to handle push subscriptions and send notifications.
*   **`web-push` library**: A Node.js library to manage VAPID keys and send push notifications.
*   **VAPID Keys**: A pair of public and private keys used to identify your application to the push service.
*   **Service Worker**: A client-side script to handle push events and display notifications.
*   **HTTPS**: Your web application must be served over HTTPS to use Service Workers and Webpush.

## Getting Started

### 1. Install Dependencies

First, ensure you have Node.js and npm installed. Then, in your project directory, install the `web-push` library:

```bash
npm install web-push
```

### 2. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are essential for Webpush. You can generate them using the `web-push` library:

```bash
./node_modules/.bin/web-push generate-vapid-keys
```

This command will output a public and private key. Store these securely, as they will be used by your server.

### 3. Backend Implementation (Node.js Example)

Your backend server will be responsible for:
*   Storing user subscriptions.
*   Sending push notifications using the `web-push` library.

Here's a basic example of how to set up a server to handle subscriptions and send notifications:

```javascript
const webpush = require('web-push');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// Replace with your actual VAPID keys
const publicVapidKey = 'YOUR_PUBLIC_VAPID_KEY';
const privateVapidKey = 'YOUR_PRIVATE_VAPID_KEY';

webpush.setVapidDetails('mailto:your_email@example.com', publicVapidKey, privateVapidKey);

app.use(bodyParser.json());

// Push Notification Route (for testing or admin use)
app.post('/send-notification', async (req, res) => {
  const { payload, subscription } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, message: 'Invalid subscription' });
  }

  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('❌ Push failed:', error.message);
    res.status(500).json({ success: false, message: 'Push failed', error: error.message });
  }
});

const PORT = process.env.PORT || 3000; // Port can be configured via .env file
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

### 3.1. Environment Configuration (.env)

To configure the server port and other sensitive information, create a `.env` file in the root of your project.

1. Config
    Example `.env` file:

    ```
    PORT=3000
    VAPID_PUBLIC_KEY="YOUR_PUBLIC_VAPID_KEY"
    VAPID_PRIVATE_KEY="YOUR_PRIVATE_VAPID_KEY"
    VAPID_SUBJECT="mailto:your_email@example.com"
    ```

### Laravel Backend Integration

If you are using Laravel for your backend, you can integrate Webpush by:

1.  **Create Push Subscriptions Table**: First, create a migration to set up your `push_subscriptions` table. This table will store the necessary information for each user's push subscription.

    ```php
    php artisan make:migration create_push_subscriptions_table
    ```

    Then, define the schema in your migration file:
    ```php
    use Illuminate\Database\Migrations\Migration;
    use Illuminate\Database\Schema\Blueprint;
    use Illuminate\Support\Facades\Schema;

    return new class extends Migration
    {
        public function up(): void
        {
            Schema::create('push_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id')->constrained()->cascadeOnDelete(); // Example: Link to a branch or user
                $table->string('endpoint', 500)->unique();
                $table->string('public_key')->nullable();
                $table->string('auth_token')->nullable();
                $table->timestamps();
            });
        }

        public function down(): void
        {
            Schema::dropIfExists('push_subscriptions');
        }
    };
    ```
    Run your migrations:
    ```bash
    php artisan migrate
    ```

2.  **Configure VAPID Keys**: Store your `publicVapidKey` and `privateVapidKey` in your `.env` file:
    ```
    VAPID_PUBLIC_KEY="YOUR_PUBLIC_VAPID_KEY"
    VAPID_PRIVATE_KEY="YOUR_PRIVATE_VAPID_KEY"
    VAPID_SUBJECT="mailto:your_email@example.com"
    ```
    Then, publish the package's configuration file (if applicable) or directly use these environment variables in your service provider or controller.

3.  **Pass Public VAPID Key to Frontend**: The `publicVapidKey` is needed by your client-side `client.js` to subscribe the user. You can pass this key from your Laravel backend to your frontend views. For example, in a Blade template:

    ```blade
    <script>
        const publicVapidKey = "{{ env('VAPID_PUBLIC_KEY') }}";
        // ... rest of your client.js logic
    </script>
    ```
    Or, if you're using a separate `client.js` file, you might expose it via a global JavaScript variable set in your main Blade layout, or fetch it via an API endpoint.

4.  **Handle Subscriptions and Send Notifications**: Your Laravel backend will need routes and controllers to:
    *   Receive push subscriptions from the frontend via an API endpoint and store them in your `push_subscriptions` table.
    *   Send push notifications using the `web-push` library (or the Laravel package's facade).

    **Define API Endpoint for Saving Subscriptions**:
    Add a route to `routes/web.php` to handle incoming subscription requests from your frontend.

    ```php
    // routes/web.php
    use Illuminate\Support\Facades\Route;
    use App\Http\Controllers\WebPushSubscriptionController;

    Route::post('webpush/save-subscription', [WebPushSubscriptionController::class, 'store'])->name('webpush.save-subscription');
    ```

    **Create a Controller to Store Subscriptions**:
    Generate a controller: `php artisan make:controller WebPushSubscriptionController`
    Implement the `store` method to save the subscription data:

    ```php
    // App/Http/Controllers/WebPushSubscriptionController.php
    <?php

    namespace App\Http\Controllers;

    use Illuminate\Http\Request;
    use App\Models\PushSubscription; // Assuming you create this model

    class WebPushSubscriptionController extends Controller
    {
        public function store(Request $request)
        {
            $request->validate([
                'endpoint' => 'required',
                'keys.auth' => 'required',
                'keys.p256dh' => 'required',
            ]);

            $user = Auth::user();

            if (!$user || !$user->branch_id) {
                return response()->json(['message' => 'Unauthorized or no branch associated'], 401);
            }

            PushSubscription::updateOrCreate(
                ['branch_id' => $user->branch_id],
                [
                    'endpoint' => $request->endpoint,
                    'public_key' => $request->keys['p256dh'],
                    'auth_token' => $request->keys['auth'],
                ]
            );

            return response()->json(['message' => 'Subscription saved successfully.']);
        }
    }
    ```
    **Create a PushSubscription Model**:
    ```php
    // App/Models/PushSubscription.php
    <?php

    namespace App\Models;

    use Illuminate\Database\Eloquent\Factories\HasFactory;
    use Illuminate\Database\Eloquent\Model;

    class PushSubscription extends Model
    {
        use HasFactory;

        protected $fillable = [
            'branch_id',
            'endpoint',
            'public_key',
            'auth_token',
        ];
    }
    ```
```

### 4. Frontend Implementation (Client-side JavaScript)

Your client-side code will need to:
*   Register a Service Worker.
*   Request permission for notifications.
*   Subscribe the user to push notifications and send the subscription object to your backend.

Instead of a plain `index.html`, you'll typically integrate this into your Laravel Blade views.

#### `resources/views/layouts/app.blade.php` (or similar Blade file)

You can include the client-side JavaScript directly in your Blade template or link to a separate JavaScript file. Ensure the `publicVapidKey` is passed correctly.

```blade
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Webpush Client</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body>
    <h1>Webpush Notifications</h1>
    <button id="subscribeButton">Enable Notifications</button>

    <script>
        const publicVapidKey = "{{ env('VAPID_PUBLIC_KEY') }}"; // Ensure this matches your .env key
        const subscribeUrl = "{{ route('webpush.save-subscription') }}"; // Laravel route for saving subscriptions
    </script>
    <script src="{{ asset('js/client.js') }}"></script>
</body>
</html>
```

#### `public/js/client.js`

```javascript
// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Check for service worker and subscribe
async function subscribeUser() {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported.');
        return;
    }
    if (!('PushManager' in window)) {
        console.warn('Push API not supported.');
        return;
    }

    try {
        console.log('Registering service worker...');
        const register = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/'
        });
        console.log('Service Worker Registered.');

        console.log('Subscribing user...');
        const subscription = await register.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
        console.log('Push Registered.');

        // Send Push Notification to backend
        console.log('Sending Push Subscription to backend...');
        const response = await fetch(subscribeUrl, {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        });

        if (response.ok) {
            console.log('Push Subscription Sent to backend successfully.');
        } else {
            console.error('Failed to send push subscription to backend.');
        }
    } catch (error) {
        console.error('Error during push subscription:', error);
    }
}

document.getElementById('subscribeButton').addEventListener('click', () => {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            subscribeUser().catch(err => console.error(err));
        } else {
            console.warn('Notification permission denied.');
        }
    });
});
```

#### `public/service-worker.js`

```javascript
console.log('Service Worker Loaded');

self.addEventListener("push", (event) => {
    const data = event.data.json(); // Attempt to parse as JSON

    let title = data.title || "New Notification";
    let options = {
        body: data.body || "You have a new notification.",
        icon: data.icon || "/img/192x192.png", // Use dynamic icon or default
        badge: data.badge || "/icons/badge-72x72.png", // Use dynamic badge or default
        data: data.data || {}, // Custom data for click actions
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Close the notification

    // Handle notification click action
    if (event.action === 'some_action') {
        // Perform action based on event.action
    } else if (event.notification.data && event.notification.data.url) {
        // Open a URL if provided in the notification data
        event.waitUntil(clients.openWindow(event.notification.data.url));
    } else {
        // Default: open the main application
        event.waitUntil(clients.openWindow('/'));
    }
});
```

### 5. Usage and Testing

1.  **Start your backend server**:
    ```bash
    node your-server-file.js
    ```
2.  **Open `index.html` in your browser**: Navigate to `http://localhost:3000` (or whatever port your server is running on).
3.  **Click "Enable Notifications"**: This will prompt for notification permission and subscribe your browser.
4.  **Send a test notification**: You can either implement a button on your `index.html` to trigger the `/send-notification` endpoint or use a tool like `curl` or Postman to send a POST request to `http://localhost:3000/send-notification`.

    ```bash
    curl -X POST http://localhost:3000/send-notification -H "Content-Type: application/json" -d '{
      "subscription": {
        "endpoint": "YOUR_SUBSCRIPTION_ENDPOINT",
        "expirationTime": null,
        "keys": {
          "p256dh": "YOUR_P256DH_KEY",
          "auth": "YOUR_AUTH_TOKEN"
        }
      },
      "payload": {
        "icon": "https://pos.qtable.vn/1a6afab283b72620929d8cf4324b5dfe.png",
        "title": "New Notification Title",
        "badge": "https://pos.qtable.vn/1a6afab283b72620929d8cf4324b5dfe.png",
        "body": "New Order Body",
        "data": {
          "url": "https://pos.qtable.vn/dashboard"
        }
      }
    }'
    ```

You should receive a push notification in your browser.

### 6. Run with Docker Compose in Prod

You can also run the Node.js backend server using Docker Compose. This is useful for development and deployment, as it containerizes your application and its dependencies.

1.  **Ensure Docker is installed**: Make sure you have Docker and Docker Compose installed on your system.
2.  **Build and run the services**: From your project root directory, execute the following command:

    ```bash
    docker-compose up --build
    ```

    This command will:
    *   Build the Docker image for your `webpush` service (if it hasn't been built or if there are changes).
    *   Start the `webpush` container, mapping port `3000` from the container to port `3000` on your host machine.

3.  **Access the application**: Once the services are up, you can access your webpush application at `http://localhost:3000` in your browser.
4.  **Stop the services**: To stop the running containers, press `Ctrl+C` in the terminal where `docker-compose up` is running. To stop and remove the containers, networks, and volumes, use:

    ```bash
    docker-compose down
    ```
