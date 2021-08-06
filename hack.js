'use strict';

class HackingGame {
  // Max rows. Note that rows are split into two columns: (32 = 2x16)
  static get MAX_ROWS_COUNT() {
    return 32;
  }

  // Max code length.
  static get MAX_CODE_LENGTH() {
    return 16;
  }

  // Max history lines.
  static get MAX_HISTORY_LINES() {
    return 15;
  }

  constructor(gameContainerSelector, options = {}) {
    this.gameContainerSelector = gameContainerSelector;

    this.options = options;

    this.wordLength = options.wordLength || 'random';

    /** Max hack attempts. */
    this.maxAttempts = options.hackingAttempts || 5;
    
    /** How likely 'tries reset' hack is. */
    this.triesResetChance = options.triesResetChance || 0.05;

    /** How many passwords should be inserted in game. */
    this.visiblePasswordsCount = options.visiblePasswordsCount || 12;

    /** How long it takes to jump from game screen to 
     * locker/unlocked screen. */
    this.screenSwitchDuration = options.screenSwitchDuration || 1500;

    /** List of elements used to form hack-code. */
    this.currentHackCode = [];
    
    /** Attempt history. */
    this.history = [];
    
    /** Passwords that exists in code. */
    this.possiblePasswords = [];
    
    /** Password under the mouse. */
    this.currentPassword = null;
    
    /** Password element under the mouse. */
    this.currentPasswordEl = null;
    
    /** User has been locked out. */
    this.acceptsInputs = true;
    
    /** Chosen dictionary that contains words for passwords. */
    this.dictionary = null;
    
    /** The correct password. */
    this.correctPassword = null;

    /** Current count of attempts left. */
    this.attemptsLeft = this.maxAttempts;
  
    /** List of created row elements. */
    this.rows = [];

    this.initUI(gameContainerSelector);
  }

  initUI(containerSelector) {
    this.container = $(containerSelector);
    if (this.container.length === 0) {
      throw new Error('Failed to find game container element!');
    }

    this.difficultyScreen = $(`<div id="difficulty-screen"></div>`);
    this.container.append(this.difficultyScreen);

    if (this.options.allowSetWordLength) {
      this.difficultyScreen.append(`
        <p>
          Select word length:
          <select id="difficult-selection">
            <option value="random" selected>Random</option>
          </select>
        </p>
      `);
    }

    if (this.options.allowSetHackingAttempts) {
      this.difficultyScreen.append(`
        <p>
          Hacking attempts: 
          <input id="hacking-attempts" type="number" value="5">
        </p>
      `);
    }

    if (this.options.allowSetVisiblePasswordCount) {
      this.difficultyScreen.append(`
        <p>
          Visible passwords count:
          <input id="visible-password-count" type="number" value="12">
        </p>
      `);
    }

    if (this.options.allowSetResetTriesHackChance) {
      this.difficultyScreen.append(`
        <p>
          Reset-tries hack chance (%):
          <input id="tries-reset-chance" type="number" value="5">
        </p>
      `);
    }
    this.difficultyScreen.append('<button id="start">Start!</button>');

    this.gameScreen = $(`
      <div id="game-screen" style="display: none;">
        <div>Attempts left: <span id="attempts-left"></span></div>
        <div id="code-container" class="monospace"></div>
        <div id="history-container" class="monospace upper-case">
          <div id="history"></div>
          <span id="current-input">&gt;</span>
          <span id="input-cursor" class="blink">▐</span>
        </div>
      </div>
    `);
    this.container.append(this.gameScreen);

    this.lockedScreen = $(`
      <div id="locked-screen" style="display: none;">
        Too many login attempts. You may try to login again after 60 minutes.
        <button class="again-btn">Again!</button>
      </div>    
    `);
    this.container.append(this.lockedScreen);

    this.unlockedScreen = $(`
      <div id="unlocked-screen" style="display: none;">
        Logged in!
        <button class="again-btn">Again!</button>
      </div>
    `);
    this.container.append(this.unlockedScreen);

    const list = this.difficultyScreen.find('#difficult-selection');
    Array.from(Object.keys(WORD_LISTS)).forEach((diff) => {
      list.append(`<option value="${diff}">${diff}</option>`);
    });
  
    this.gameScreen.on(
      'mouseenter', '.letter, .password', 
      (evt) => this.onEnter(evt));

    this.gameScreen.on(
      'mouseleave', '.letter, .password', 
      (evt) => this.onLeave(evt));

    this.gameScreen.on(
      'click', '.letter, .password', 
      (evt) => this.onClick(evt));
  
    this.container.find('.again-btn').click(() => {
      this.resetEverything();
    });
    
    this.container.find('#start').click(() => {
      this.gameScreen.show();
      this.difficultyScreen.hide();
      this.init();
    });
  }

  /**
   * Entry function. Called when page has loaded.
   */
  init() {
    this.readSettingsFromUI();

    /** Starting line number. This will be displayed as hex value on UI. */
    let lineNro = Utils.getRandomInt(18235, 58235);

    const container = this.gameScreen.find('#code-container');

    // Generate rows.
    for(let rowI = 0; rowI < HackingGame.MAX_ROWS_COUNT; rowI += 1) {
      const rowEl = $('<div class="row"></div>');
      container.append(rowEl);

      const lineNroStr = lineNro.toString(16).toLocaleUpperCase();
      const rowNroEl = $(`<span class="row-number">0x${lineNroStr}&nbsp;</span>`);
      rowEl.append(rowNroEl);

      const code = this.randomCode(HackingGame.MAX_CODE_LENGTH);
      const rowCodeEl = $(`<span class="row-code upper-case">${code}</span>`);
      rowEl.append(rowCodeEl);

      this.rows.push(rowEl);

      // Move line number to the next row.
      lineNro += HackingGame.MAX_CODE_LENGTH + 1;
    }

    /** Password free rows. */
    const availableRows = [...this.rows];
    const wordLength = this.dictionary[0].length;

    // We will populate rows with passwords until we run out of passwords or
    // we hit the password limit or we run out of rows.
    while (
      this.possiblePasswords.length < this.visiblePasswordsCount && 
      this.dictionary.length > 0 && 
      availableRows.length > 0
    ) {
      const rowIndex = Utils.randomIndex(availableRows);
      const row = availableRows.splice(rowIndex, 1)[0];
      const wordIndex = Utils.randomIndex(this.dictionary);
      const word = this.dictionary.splice(wordIndex, 1)[0];

      const letters = row.find('.letter');

      // Create and insert the password in middle of characters.
      const passwordEl = $(`<span class="password">${word}</span>`);
      const insPos = Utils.getRandomInt(0, HackingGame.MAX_CODE_LENGTH - wordLength);
      passwordEl.insertAfter(letters[insPos]);

      // Store password info.
      this.possiblePasswords.push(passwordEl[0]);

      // The row now contains original code and the password, so total characters
      // on the row exceeds MAX_CODE_LENGTH. We will remove characters if they are
      // inside the password boundary.
      for(let letterIndex = HackingGame.MAX_CODE_LENGTH - 1; letterIndex >= 0; letterIndex -= 1) {
        // If letter is between start AND END
        if (insPos <= letterIndex && letterIndex < insPos + wordLength ) {
          letters[letterIndex].remove();
        }
      }
    }

    // Select a random password and set it as the correct password.
    const passwordIndex = Utils.randomIndex(this.possiblePasswords);
    this.correctPassword = this.possiblePasswords[passwordIndex].textContent;

    this.updateAttemptsLeft();
  }


  /**
   * Reads settings from UI.
   * 
   * If cannot read values from UI, uses values from option-object. 
   * If option-object was never given, then uses default values.
   */
  readSettingsFromUI() {
    // Get the word list by difficulty.
    this.wordLength = this.difficultyScreen.find('#difficult-selection').val() || this.wordLength;

    if (this.wordLength === 'random') {
      this.dictionary = JSON.parse(JSON.stringify(this.chooseRandomWordList(WORD_LISTS)));
    } else {
      this.dictionary = JSON.parse(JSON.stringify(WORD_LISTS[this.wordLength]));
    }
    
    this.maxAttempts = this.difficultyScreen.find('#hacking-attempts').val() || this.maxAttempts;
    this.attemptsLeft = this.maxAttempts;
    this.visiblePasswordsCount = this.difficultyScreen.find('#visible-password-count').val() || this.visiblePasswordsCount;

    const resetChance = this.difficultyScreen.find('#tries-reset-chance').val() / 100.0;
    this.triesResetChance = isNaN(resetChance) ? this.triesResetChance : resetChance;
  }


  /**
   * Generates score for similarity.
   * 
   * The similarity score indicates the number of letters in 
   * guessed word that exactly match the terminal password in 
   * both letter and position.
   * 
   * @returns {number} Returns the similarity score.
   */
  getSimilarity() {
    let similarity = 0;

    for(let i = 0; i < this.correctPassword.length; i++) {
      const charA = this.correctPassword.charAt(i);
      const charB = this.currentPassword.charAt(i);
      similarity += charA === charB ? 1 : 0;
    }

    return similarity;
  }


  /**
   * Finds random dud password and splices it from the possible 
   * passwords list.
   * 
   * @returns Returns a dud password.
   */
  getDudPassword() {
    // Only the correct password remains. Do nothing.
    if (this.possiblePasswords.length <= 1) {
      return null;
    }

    // Start with random index.
    let dudIndex = Utils.randomIndex(this.possiblePasswords);

    // Repeat until we find an index with dud password.
    while (this.possiblePasswords[dudIndex].textContent === this.correctPassword) {
      dudIndex = Utils.randomIndex(this.possiblePasswords);
    }

    // Remove dud from possible passwords and return it.
    return this.possiblePasswords.splice(dudIndex, 1)[0];
  }


  /**
   * Removes a dud password and replaces it with dot letters.
   * If dud is falsy, does nothing.
   * @param {*} password Password to be removed.
   */
  removePassword(password) {
    if (!password) {
      return;
    }

    // Create dot characters.
    for(let i = 0; i < password.textContent.length; i++) {
      const dot = $('<span class="letter">.</span>');
      dot.insertAfter(password);
    }

    // Remove the password.
    password.remove();
  }


  /**
   * Called when user clicks a symbol.
   * @param {*} evt Click event.
   */
  onClick(evt) {
    const element = evt.target;

    // User is locked out, do nothing.
    if (!this.acceptsInputs) {
      return;
    }

    // Mouse is hovering over a code.
    else if (this.currentHackCode.length) {
      element.classList.add('used');

      // Convert letter-elements to a string.
      const hackCodeStr = this.currentHackCode
        .reduce((prev, cur) => prev + cur.textContent, '');
      this.appendHistory('>' + hackCodeStr);

      // Activate 'tries reset' hack.
      if (Math.random() <= this.triesResetChance) {
        this.attemptsLeft = this.maxAttempts;
        this.appendHistory('Tries reset');
        this.updateAttemptsLeft();
        this.clearCode();
      } 
      
      // Activate 'dud removed' hack.
      else {
        const dudPass = this.getDudPassword();
        this.removePassword(dudPass);
        this.appendHistory('Removed dud');
        this.clearCode();
      }
    } 
    
    // Mouse is hovering over a password.
    else if (this.currentPassword) {
      // User guessed the password.
      if (this.correctPassword === this.currentPassword) {
        this.appendHistory('>' + this.currentPassword);
        this.appendHistory('Correct password!');
        this.acceptsInputs = false;

        setTimeout(() => {
          this.gameScreen.hide();
          this.unlockedScreen.show();
        }, this.screenSwitchDuration);
      } 

      // User guessed wrong password.
      else {
        this.appendHistory('>' + this.currentPassword);
        this.appendHistory('Wrong password!');
        this.appendHistory('Similarity: ' + this.getSimilarity());
        this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);
        this.acceptsInputs = this.attemptsLeft > 0;

        if (!this.acceptsInputs) {
          this.appendHistory('Terminal locked!');
          this.appendHistory('Too many login attempts!');
          setTimeout(() => {
            this.lockedScreen.show();
            this.gameScreen.hide();
          }, this.screenSwitchDuration);
        }

        this.updateAttemptsLeft();
      }
    }

    // Mouse is hovering over a symbol with no action linked on it.
    else {
      this.appendHistory('>' + element.textContent);
      this.appendHistory('Unknown input');
    }
  }


  /**
   * Updates attempts-left counter.
   */
  updateAttemptsLeft() {
    this.gameScreen
      .find('#attempts-left')
      .text(`${this.attemptsLeft} / ${this.maxAttempts}`);
  }


  /**
   * Appends a line to history box.
   * Sanities line from HTML characters.
   * @param {string} line Line to record.
   */
  appendHistory(line) {
    this.history.push(Utils.escapeHtml(line));

    // Limit history lines.
    if (this.history.length > HackingGame.MAX_HISTORY_LINES) {
      this.history.splice(0, 1);
    }

    this.updateHistory();
  }


  /**
   * Updates history lines.
   */
  updateHistory() {
    const html = this.history
      .map((item) => `<div class="history-item">${item}</div>`)
      .join('');

    this.gameScreen
      .find('#history')
      .html(html);
  }


  /**
   * Called when user moves the mouse over a letter or a password.
   * @param {*} evt On enter event.
   */
  onEnter(evt) {
    const element = evt.target;
    element.classList.add('hover');

    // User is hovering over a hacking code that has not been used.
    if (
      this.isHackCodeCharacter(element.textContent) && 
      !element.classList.contains('used')
    ) {
      this.clearCode();

      this.currentHackCode = this.getHackCode(element);
      this.updateCurrentInput(this.lettersToString(this.currentHackCode));

      // If we found a matching bracket, 
      // highlight all the characters.
      this.currentHackCode.forEach((letter) => {
        letter.classList.add('hover');
      });
    } 
    
    // User is hovering over a password.
    else if (element.classList.contains('password')) {
      element.classList.add('hover');
      this.currentPassword = element.textContent;
      this.currentPasswordEl = element;
      this.updateCurrentInput(element.textContent);
    }

    // Nothing special, just update input display.
    else {
      this.updateCurrentInput(element.textContent);
    }
  }


  /**
   * Converts array or letters into a string.
   * @param {Element[]} letters Array of letters.
   * @returns {string}
   */
  lettersToString(letters) {
    return letters
      .map((letter) => letter.textContent)
      .join('');
  }


  /**
   * Updates current input display.
   * @param {string} str 
   */
  updateCurrentInput(str) {
      // Show current character in input box.
      this.gameScreen
        .find('#current-input')
        .text('>' + str);
  }


  /**
   * Checks if the character is one of these: `<[({`
   * @param {string} char
   * @returns {boolean}
   */
  isHackCodeCharacter(char) {
    return ['<', '[', '{', '('].includes(char);
  }


  /**
   * Attempts to parse hack code. If hack code can be parsed, 
   * returns an array of letters. If none is found, 
   * returns an empty array.
   * 
   * @param {Element} letter 
   * @returns {Element[]} Returns an array of letters. 
   *  If no hack code can be parsed, returns an empty array.
   */
  getHackCode(letter) {
    const matchingBrackets = Object.freeze({
      '<': '>', '[': ']', '(': ')', '{': '}',
    });
    const letters = [letter];
    const currentChar = letter.textContent;

    let sibling = null;

    // Loop siblings until we run out of them or we find matching bracket.
    // The very last sibling will return null for nextSibling.
    while ((sibling = (sibling || letter).nextSibling)) {
      // Store characters while looping.
      letters.push(sibling);

      // We encountered a password. Stop here.
      if (sibling.classList.contains('password')) {
        return [];
      }
      
      // If we find the matching bracket, stop here.
      if (matchingBrackets[currentChar] === sibling.textContent) {
        return letters;
      }
    }

    return [];
  }


  /**
   * Resets state for hack code and passwords.
   */
  clearCode() {
    this.currentHackCode.forEach((el) => el.classList.remove('hover'));
    this.currentHackCode = [];
    this.currentPassword = null;
    this.currentPasswordEl = null;
  }


  /**
   * Called when user moves the mouse away from a letter or a password.
   * @param {*} evt On leave event.
   */
  onLeave(evt) {
    evt.target.classList.remove('hover');
    this.clearCode();
    this.updateCurrentInput('');
  }


  /**
   * Selects a random word list.
   * @returns Returns a word list.
   */
  chooseRandomWordList() {
    const lengths = Object.keys(WORD_LISTS);
    const length = lengths[Utils.randomIndex(lengths)];
    return WORD_LISTS[length];
  }


  /**
   * Generates random code. Each character is wrapped 
   * inside a span-element with 'letter'-class.
   * Symbols are escaped to produce HTML-safe code.
   * 
   * @param {number} length Indicates how long the code should be.
   * @returns {string} Returns generated code.
   */
    randomCode(length) {
      const characters = '.,:;"\'\\/|_-<>*+!?={[()]}@';
      let code = '';
      let currentLength = 0;
  
      // Build string until we hit length.
      while (currentLength < length) {
        const letterIndex = Math.floor(Math.random() * characters.length);
        const letter = Utils.escapeHtml(characters.charAt(letterIndex));
        code += `<span class="letter">${letter}</span>`;
        currentLength += 1;
      }
  
      return code;
    }


  /**
   * Reset everything.
   */
  resetEverything() {
    this.gameScreen.find('#code-container').children().remove();
    this.gameScreen.find('#history-container .history-item').remove();

    this.rows = [];
    this.history = [];
    this.possiblePasswords = [];
    this.acceptsInputs = true;
    this.currentPassword = null;
    this.currentPasswordEl = null;
    this.dictionary = this.chooseRandomWordList(WORD_LISTS);
    this.correctPassword = null;
    this.attemptsLeft = this.maxAttempts;

    this.difficultyScreen.show();
    this.gameScreen.hide();
    this.lockedScreen.hide();
    this.unlockedScreen.hide();
  }
}
