const sharp = require("sharp");
const fs = require("fs-extra");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch");
const pixelmatchFn = pixelmatch.default || pixelmatch;
const { ssim } = require("ssim.js");

/**
 * Hàm hỗ trợ đọc file PNG và chuyển thành đối tượng PNG của pngjs
 * @param {string|Buffer} input - Đường dẫn file hoặc Buffer ảnh
 */
function loadPng(input) {
    const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
    return PNG.sync.read(buffer);
}

/**
 * Tiền xử lý ảnh: Làm mờ nhẹ và chuyển sang ảnh xám để giảm nhiễu khi so sánh SSIM
 * @param {string} imgPath - Đường dẫn ảnh gốc
 * @returns {string} - Đường dẫn ảnh đã xử lý
 */
async function preprocess(imgPath) {
    const out = imgPath.replace(".png", "_prep.png");
    await sharp(imgPath)
        .blur(1.5) // Giảm độ nhòe xuống một chút để giữ lại chi tiết quan trọng
        .grayscale()
        .toFile(out);
    return out;
}

/**
 * Tính điểm SSIM (Structural Similarity Index)
 * Đo lường sự giống nhau về cấu trúc giữa 2 ảnh
 */
function ssimScore(img1Path, img2Path) {
    try {
        const a = loadPng(img1Path);
        const b = loadPng(img2Path);
        
        // ssim.js trả về mssim (0 đến 1)
        const result = ssim(a, b);
        return result.mssim;
    } catch (err) {
        console.error("SSIM Error:", err);
        return 0;
    }
}

/**
 * Tính điểm cạnh (Edge Score)
 * Sử dụng ma trận tích chập (Convolution) để tìm các đường kẻ/khung hình
 */
async function edgeScore(img1Path, img2Path) {
    const kernel = {
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] // Laplacian kernel
    };

    try {
        // Tối ưu: Xử lý tích chập trong bộ nhớ (Buffer), không ghi ra file tạm
        const [edge1Buf, edge2Buf] = await Promise.all([
            sharp(img1Path).convolve(kernel).toBuffer(),
            sharp(img2Path).convolve(kernel).toBuffer()
        ]);

        const a = PNG.sync.read(edge1Buf);
        const b = PNG.sync.read(edge2Buf);

        const diff = new PNG({ width: a.width, height: a.height });

        // Sử dụng pixelmatch để đếm số pixel khác biệt giữa 2 bản đồ cạnh
        const mismatch = pixelmatchFn(
            a.data,
            b.data,
            diff.data,
            a.width,
            a.height,
            { threshold: 0.15 }
        );

        // Trả về tỷ lệ phần trăm pixel trùng khớp
        return 1 - mismatch / (a.width * a.height);
    } catch (err) {
        console.error("Edge Score Error:", err);
        return 0;
    }
}

/**
 * Tính điểm màu sắc (Color Score)
 * So sánh sự khác biệt giá trị RGB trung bình trên toàn bộ ảnh
 */
function colorScore(img1Path, img2Path) {
    try {
        const a = loadPng(img1Path);
        const b = loadPng(img2Path);

        let totalDiff = 0;
        const numPixels = a.data.length / 4;

        for (let i = 0; i < a.data.length; i += 4) {
            // Tính khoảng cách trị tuyệt đối của R, G, B
            totalDiff += Math.abs(a.data[i] - b.data[i]);     // Red
            totalDiff += Math.abs(a.data[i + 1] - b.data[i + 1]); // Green
            totalDiff += Math.abs(a.data[i + 2] - b.data[i + 2]); // Blue
        }

        // Giá trị khác biệt tối đa có thể có
        const maxPossibleDiff = 255 * 3 * numPixels;
        
        // Trả về độ tương đồng (1 - tỷ lệ khác biệt)
        return 1 - (totalDiff / maxPossibleDiff);
    } catch (err) {
        console.error("Color Score Error:", err);
        return 0;
    }
}

module.exports = { 
    preprocess, 
    ssimScore, 
    edgeScore, 
    colorScore 
};