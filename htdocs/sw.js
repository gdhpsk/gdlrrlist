const addResourcesToCache = async (resources) => {
  const cache = await caches.open("v1");
  await cache.addAll(resources);
};

const urlB64ToUint8Array = base64String => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const saveSubscription = async subscription => {
  const url = 'https://gdlrrlist.com/api/v1/notifications/subscribe'
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  })
  return response.text()
}
self.addEventListener('install', function (event) {
	self.skipWaiting();
  event.waitUntil(
    addResourcesToCache([
      "/"
    ])
  );
})
self.addEventListener('activate', async () => {
  try {
    const applicationServerKey = urlB64ToUint8Array(
      'BJM9sD9iwTE_-NS91qCJXetVlTgFr-oH060rDMqy3ywiJJlOUa5sJuR5k9y-hVCLW96NX92peJWOpuIllzPJDJA'
    )
    const options = { applicationServerKey, userVisibleOnly: true }
    const subscription = await self.registration.pushManager.subscribe(options)
    const response = await saveSubscription(subscription)
    console.log(response)
  } catch (err) {
    console.log('Error', err)
  }
})

self.addEventListener('push', function(event) {
  if (event.data) {
    let data = event.data.json()
    console.log('Push event!! ', data)
    let title = data.subject;
   let icon = "https://gdlrrlist.com/icon.png"
   let body = data.message;
    try {
     navigator.serviceWorker.ready.then(function(swreg) {
          swreg.showNotification(title, { body: `From ${data.from}: ${body}`, icon });
        });
    } catch(e) {
      try {
        self.registration.showNotification(title, { body: `From ${data.from}: ${body}`, icon });
      } catch(x) {
      }
    }
  } else {
    console.log('Push event but no data')
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
    event.waitUntil(
      clients.openWindow("https://gdlrrlist.com/notifications")
    );
});

const storage = new ServiceWorkerStorage('sw:storage', 1);

async function handlePush() {
  const newSubscription = await self.registration.pushManager.getSubscription();
  const oldSubscription = JSON.parse(await storage.getItem('subscription'));
  if(newSubscription.endpoint !== oldSubscription.endpoint) {
    storage.setItem('subscription', newSubscription);
    const req = new Request('https://gdlrrlist.com/api/v1/notifications/subscribe', {
      method: 'POST',
      headers: {'content-type': "application/json"},
      body: JSON.stringify(newSubscription)
    });
    const response = await self.fetch(req);
  }

}

async function savePush(subscription) {
  await storage.setItem('subscription', subscription);
}

self.addEventListener('pushsubscriptionchange', (event) => 
                      event.waitUntil(handlePush()));
self.addEventListener('message', (event) => {
  if(event.data.action === 'REQUEST_SUBSCRIPTION') {
     event.waitUntil(savePush(event.data.subscription));
  }
});