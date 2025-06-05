const puppeteer = require('puppeteer');
const path = require('path');

async function captureScreen() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // ビューポートサイズを設定
    await page.setViewport({
        width: 1280,
        height: 720,
        deviceScaleFactor: 2
    });
    
    // 開発サーバーにアクセス
    try {
        await page.goto('http://localhost:5173', {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        });
        
        // Three.jsが完全に読み込まれるまで待機
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
        console.error('Navigation error:', error);
        // エラーが発生しても続行
    }
    
    // スクリーンショットを撮影
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(__dirname, `screenshots/solar-system-${timestamp}.png`);
    
    await page.screenshot({
        path: screenshotPath,
        fullPage: false
    });
    
    console.log(`Screenshot saved: ${screenshotPath}`);
    
    await browser.close();
}

// 実行
captureScreen().catch(console.error);