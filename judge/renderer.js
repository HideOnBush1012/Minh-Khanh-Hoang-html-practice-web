const puppeteer = require("puppeteer");
const path = require("path");

let browser;

async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
    }
    return browser;
}

async function renderHTML(htmlPath, outputPath) {
    const instance = await getBrowser();
    const page = await instance.newPage();
    
    try {
        // BẢO MẬT: Tắt JavaScript để tránh người dùng nộp mã độc
        await page.setJavaScriptEnabled(false);
        
        // Chặn request ra internet hoặc file hệ thống
        await page.setRequestInterception(true);
        page.on("request", req => {
            const url = req.url();
            if (url.startsWith("file://") && !url.includes(path.basename(htmlPath))) {
                return req.abort();
            }
            if (url.startsWith("http")) return req.abort();
            req.continue();
        });

        await page.setViewport({ width: 800, height: 600 });
        await page.goto("file://" + path.resolve(htmlPath), { 
            waitUntil: "networkidle0", 
            timeout: 5000 
        });

        await page.screenshot({ path: outputPath });
    } finally {
        // Đảm bảo luôn đóng page để tránh rò rỉ RAM
        await page.close();
    }
}

module.exports = { renderHTML };