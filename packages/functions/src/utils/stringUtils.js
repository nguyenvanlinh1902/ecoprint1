/**
 * Tạo slug URL-friendly từ chuỗi.
 * VD: "Sản Phẩm Mới" -> "san-pham-moi"
 * @param {string} str - Chuỗi cần chuyển đổi thành slug
 * @param {boolean} lowercase - Chuyển thành chữ thường (mặc định: true)
 * @returns {string} - Slug URL-friendly
 */
export function generateSlug(str, lowercase = true) {
  if (!str) return '';
  
  // Chuyển đổi tiếng Việt có dấu thành không dấu
  const from = "àáäâãåăæąçćčđďèéëêęěğǵḧìíïîįıłḿǹńňñòóöôœøṕŕřßşśšșťțùúüûǘůűūųẃẍÿýźžż";
  const to = "aaaaaaaaacccddeeeeeeggghiiiiilmnnnnoooooorrsssssttuuuuuuuuwxyyzzz";
  
  // Chuyển đổi dấu thành không dấu
  let slug = str.trim();
  for (let i = 0; i < from.length; i++) {
    slug = slug.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }
  
  // Xóa các ký tự không hợp lệ và thay thế khoảng trắng bằng dấu gạch ngang
  slug = slug
    .replace(/[^a-z0-9 -]/g, '') // Loại bỏ ký tự đặc biệt
    .replace(/\s+/g, '-')        // Thay thế khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, '-')         // Loại bỏ các dấu gạch ngang liên tiếp
    .replace(/^-+/, '')          // Cắt bỏ dấu gạch ngang ở đầu chuỗi
    .replace(/-+$/, '');         // Cắt bỏ dấu gạch ngang ở cuối chuỗi
  
  // Chuyển về chữ thường nếu cần
  return lowercase ? slug.toLowerCase() : slug;
};

/**
 * Cắt ngắn chuỗi và thêm dấu "..." nếu vượt quá độ dài tối đa
 * @param {string} str - Chuỗi cần cắt ngắn
 * @param {number} maxLength - Độ dài tối đa (mặc định: 100)
 * @param {string} suffix - Chuỗi thêm vào cuối nếu cần cắt ngắn (mặc định: "...")
 * @returns {string} - Chuỗi đã cắt ngắn
 */
export function truncateString(str, maxLength = 100, suffix = '...') {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  
  return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Chuyển đổi chuỗi thành dạng title case (viết hoa chữ cái đầu mỗi từ)
 * VD: "hello world" -> "Hello World"
 * @param {string} str - Chuỗi cần chuyển đổi
 * @returns {string} - Chuỗi đã chuyển đổi thành title case
 */
export function toTitleCase(str) {
  if (!str) return '';
  
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Chuyển số thành chuỗi có định dạng tiền tệ
 * @param {number} amount - Số tiền
 * @param {string} currency - Đơn vị tiền tệ (mặc định: 'VND')
 * @returns {string} - Chuỗi tiền tệ định dạng
 */
export function formatCurrency(amount, currency = 'VND') {
  if (amount === undefined || amount === null) return '';
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'VND' ? 0 : 2
  }).format(amount);
};

/**
 * Chuyển đổi chuỗi HTML thành text thuần túy
 * @param {string} html - Chuỗi HTML
 * @returns {string} - Chuỗi text thuần túy
 */
export function htmlToText(html) {
  if (!html) return '';
  
  // Loại bỏ các thẻ HTML
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}; 