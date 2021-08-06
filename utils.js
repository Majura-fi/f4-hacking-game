class Utils {
  /**
   * Generates a random integer from range between min and max.
   * @param {number} min Smallest possible number.
   * @param {number} max Largest possible number.
   * @returns {number} Returns a random integer number.
   */
  static getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Replaces unsafe HTML characters from the string.
   * @param {string} unsafe String to sanitize
   * @returns {string} Returns HTML-safe string.
   */
  static escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Returns random index from the array.
   * @param {*[]} array 
   * @returns {number}
   */
  static randomIndex(array) {
    return Math.floor(Math.random() * array.length);
  }
}
