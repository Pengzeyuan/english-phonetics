// service-worker.js
const CACHE_NAME = 'phonetic-cards-v2.0';
const APP_VERSION = '2.0.0';

// 预缓存的核心文件 - 使用相对路径
const STATIC_CACHE_FILES = [
  './index.html',
  './manifest.json',
  './service-worker.js',
  './images/icon-192.png',  // ✅ 正确路径
  './images/icon-512.png'   // ✅ 正确路径
];

// 运行时缓存的资源
const RUNTIME_CACHE_FILES = [
  // 图片文件
  './images/挨.jpg',
  './images/挨单词.jpg',
  './images/哎.jpg',
  './images/哎单词.jpg',
  './images/啊--.jpg',
  './images/啊--单词.jpg',
  './images/啊.jpg',
  './images/啊单词.jpg',
  
  // 音频文件
  './audio/ant.mp3',
  './audio/head.mp3',
  './audio/father.mp3',
  './audio/son.mp3'
];

// 安装事件
self.addEventListener('install', event => {
  console.log('📦 Service Worker 安装中，版本:', APP_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🔧 开始缓存文件...');
        // 先只缓存最重要的文件
        return cache.addAll([
          './index.html',
          './manifest.json'
        ]);
      })
      .then(() => {
        console.log('✅ 核心文件缓存完成');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ 缓存失败:', error);
        console.error('尝试缓存的文件:', STATIC_CACHE_FILES);
      })
  );
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('🎯 Service Worker 激活中...');
  
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 立即控制客户端
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker 激活完成');
      
      // 激活后缓存其他资源
      return cacheAdditionalResources();
    })
  );
});

// 缓存其他资源
async function cacheAdditionalResources() {
  const cache = await caches.open(CACHE_NAME);
  const resources = [
    './images/icon-192.png',
    './images/icon-512.png',
    './service-worker.js'
  ];
  
  for (const resource of resources) {
    try {
      await cache.add(resource);
      console.log(`✅ 已缓存: ${resource}`);
    } catch (error) {
      console.warn(`⚠️ 缓存失败: ${resource}`, error);
    }
  }
}

// fetch事件处理
self.addEventListener('fetch', event => {
  // 只处理同源请求
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // 只缓存GET请求
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 如果缓存中有，返回缓存
        if (cachedResponse) {
          console.log('💾 从缓存返回:', event.request.url);
          return cachedResponse;
        }
        
        // 否则从网络获取
        return fetch(event.request)
          .then(response => {
            // 只缓存成功的响应
            if (response && response.status === 200) {
              // 克隆响应以进行缓存
              const responseToCache = response.clone();
              
              // 对于特定类型的文件才缓存
              const url = event.request.url;
              const shouldCache = 
                url.includes('/images/') ||
                url.includes('/audio/') ||
                url.endsWith('.html') ||
                url.endsWith('.js') ||
                url.endsWith('.json');
              
              if (shouldCache) {
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                    console.log('✅ 已缓存:', event.request.url);
                  });
              }
            }
            
            return response;
          })
          .catch(error => {
            console.log('🌐 网络请求失败:', event.request.url, error);
            
            // 对于图片，返回占位符
            if (event.request.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
              return new Response(
                `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
                  <rect width="100%" height="100%" fill="#f8f9fa"/>
                  <text x="50%" y="50%" text-anchor="middle" fill="#666" font-family="Arial">
                    图片加载中...
                  </text>
                </svg>`,
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            
            // 对于音频，返回错误
            if (event.request.url.match(/\.(mp3|wav)$/i)) {
              return new Response('音频无法加载', {
                status: 404,
                headers: { 'Content-Type': 'text/plain' }
              });
            }
            
            // 其他请求返回网络错误
            return new Response('网络连接失败', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});