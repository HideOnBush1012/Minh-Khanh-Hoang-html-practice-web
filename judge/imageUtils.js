const sharp = require("sharp");
const fs = require("fs-extra");

/**
 * Căn chỉnh hai ảnh về cùng một kích thước (dựa trên ảnh mẫu)
 * để các hàm so sánh pixel không bị lệch.
 */
async function alignImages(refPath, stuPath) {
    const metaRef = await sharp(refPath).metadata();
    const metaStu = await sharp(stuPath).metadata();

    const width = metaRef.width;
    const height = metaRef.height;

    const alignedRef = refPath.replace(".png", "_aligned.png");
    const alignedStu = stuPath.replace(".png", "_aligned.png");

    // Đưa cả hai về cùng kích thước của ảnh mẫu (Reference)
    // Nếu ảnh học sinh nhỏ hơn, nó sẽ được padding (thêm khoảng trống)
    // Nếu lớn hơn, nó sẽ được crop hoặc thu nhỏ.
    await sharp(refPath)
        .resize(width, height)
        .toFile(alignedRef);

    await sharp(stuPath)
        .resize(width, height, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 } // Nền trắng nếu ảnh nộp thiếu kích thước
        })
        .toFile(alignedStu);

    return { 
        alignedRef, 
        alignedStu, 
        meta1: metaRef, 
        meta2: metaStu 
    };
}

/**
 * Tính toán hình phạt dựa trên sự chênh lệch kích thước thực tế.
 * Nếu nộp file quá to hoặc quá nhỏ so với mẫu, điểm sẽ bị trừ nhẹ.
 */
function sizePenalty(metaRef, metaStu) {
    const widthDiff = Math.abs(metaRef.width - metaStu.width);
    const heightDiff = Math.abs(metaRef.height - metaStu.height);

    const penalty = (widthDiff / metaRef.width) + (heightDiff / metaRef.height);

    // Trả về hệ số từ 0 đến 1 (1 là hoàn hảo, 0 là quá tệ)
    return Math.max(0, 1 - penalty);
}

module.exports = { alignImages, sizePenalty };