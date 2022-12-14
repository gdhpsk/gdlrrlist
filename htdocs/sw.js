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
    let title = data.subject;
   let icon = "https://gdlrrlist.com/icon.png"
   let body = data.message;
    try {
     navigator.serviceWorker.ready.then(function(swreg) {
          swreg.showNotification(title, { body: `From ${data.from}: ${body}`, icon, tag: data.id});
        });
    } catch(e) {
      try {
        self.registration.showNotification(title, { body: `From ${data.from}: ${body}`, icon, tag: data.id});
      } catch(x) {
      }
    }
  } else {
    console.log('Push event but no data')
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'archive') {
    archiveEmail();
  } else {
    clients.openWindow(`/notifications${event.notification.tag ? `/${event.notification.tag}` : ""}`);
  }
});

const sub = {}

async function handlePush() {
  const newSubscription = await self.registration.pushManager.getSubscription();
  if(newSubscription.endpoint !== sub.endpoint) {
    sub = newSubscription
    const req = new Request('https://gdlrrlist.com/api/v1/notifications/subscribe', {
      method: 'POST',
      headers: {'content-type': "application/json"},
      body: JSON.stringify(newSubscription)
    });
    await self.fetch(req);
  }

}

async function savePush(subscription) {
 sub = subscription
}

self.addEventListener('pushsubscriptionchange', (event) => event.waitUntil(handlePush()));
self.addEventListener('message', (event) => {
  if(event.data.action === 'REQUEST_SUBSCRIPTION') {
     event.waitUntil(savePush(event.data.subscription));
  }
});