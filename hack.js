/*
Line numbers width: 6 em
Code width: 12 em
Total: 18 em
Lines: 16
Characters: 384
*/

/** How many attempts are allowed. */
const MAX_ATTEMPTS = 5;

/** Max code length. */
const MAX_CODE_LENGTH = 16;

/** Max rows. Note that rows are split into two columns: (32 = 2x16) */
const MAX_ROWS_COUNT = 32;

/** How many passwords are shown on the screen. */
const MAX_POSSIBLE_PASSWORDS = 12;

/** List of elements used to form hack-code. */
let currentLetters = [];

/** Attempt history. */
let history = [];

/** Passwords that exists in code. */
let possiblePasswords = [];

/** Currently hovered symbol is a code. */
let isCode = false;

/** Currently hovered symbol is a password. */
let isPassword = false;

/** Password under the mouse. */
let currentPassword = null;

/** Password element under the mouse. */
let currentPasswordEl = null;

/** User has been locked out. */
let isLocked = false;

/** Chosen dictionary that contains words for passwords. */
let dictionary = chooseRandomWordList(WORD_LISTS);

/** The correct password. */
let correctPassword = null;

/** Current count of attempts left. */
let attemptsLeft = MAX_ATTEMPTS;

/** List of created row elements. */
let rows = [];



/**
 * Entry function. Called when page has loaded.
 */
function run() {
  // Get the word list by difficulty.
  const diff = $('#difficulty').val();
  dictionary = WORD_LISTS[diff];

  /** Starting line number. This will be displayed as hex value on UI. */
  let lineNro = getRandomInt(18235, 58235);

  const container = $('#hack-screen');

  // Generate rows.
  for(let rowI = 0; rowI < MAX_ROWS_COUNT; rowI += 1) {
    const rowEl = $('<div class="row"></div>');
    container.append(rowEl);

    const lineNroStr = lineNro.toString(16).toLocaleUpperCase();
    const rowNroEl = $(`<span class="row-number">0x${lineNroStr}&nbsp;</span>`);
    rowEl.append(rowNroEl);

    const code = randomCode(MAX_CODE_LENGTH);
    const rowCodeEl = $(`<span class="row-code upper-case">${code}</span>`);
    rowEl.append(rowCodeEl);

    rows.push(rowEl);

    // Move line number to the next row.
    lineNro += MAX_CODE_LENGTH + 1;
  }

  /** Password free rows. */
  const availableRows = [...rows];
  const wordLength = dictionary[0].length;

  // We will populate rows with passwords until we run out of passwords or
  // we hit the password limit or we run out of rows.
  while (
    possiblePasswords.length < MAX_POSSIBLE_PASSWORDS && 
    dictionary.length > 0 && 
    availableRows.length > 0
  ) {
    const rowIndex = Math.floor(Math.random() * availableRows.length);
    const row = availableRows.splice(rowIndex, 1)[0];
    const wordIndex = Math.floor(Math.random() * dictionary.length);
    const word = dictionary.splice(wordIndex, 1)[0];

    let letters = row.find('.letter');

    // Create and insert the password in middle of characters.
    const passwordEl = $(`<span class="password">${word}</span>`);
    const insPos = getRandomInt(0, MAX_CODE_LENGTH - wordLength);
    passwordEl.insertAfter(letters[insPos]);

    // Store password info.
    possiblePasswords.push({
      row,
      word,
      el: passwordEl,
    });

    // The row now contains original code and the password, so total characters
    // on the row exceeds MAX_CODE_LENGTH. We will remove characters if they are
    // inside the password boundary.
    for(let letterIndex = MAX_CODE_LENGTH - 1; letterIndex >= 0; letterIndex -= 1) {
      // If letter is between start AND END
      if (insPos <= letterIndex && letterIndex < insPos + wordLength ) {
        letters[letterIndex].remove();
      }
    }
  }

  // Select a random password and set it as the correct password.
  correctPassword = possiblePasswords[Math.floor(Math.random() * possiblePasswords.length)].word;

  updateAttemptsLeft();
}


/**
 * Generates score for similarity.
 * 
 * The similarity score indicates the number of letters in guessed word 
 * that exactly match the terminal password in both letter and position.
 */
function getSimilarity() {
  let similarity = 0;

  for(let i = 0; i < correctPassword.length; i++) {
    similarity += correctPassword.charAt(i) === currentPassword.charAt(i) ? 1 : 0;
  }

  return similarity;
}


/**
 * Finds random dud password and splices it from the possible passwords list.
 * @returns Returns a dud password.
 */
function getDudPassword() {
  // Only the correct password remains. Do nothing.
  if (possiblePasswords.length === 1) {
    return null;
  }

  // Start with random index.
  let dudIndex = Math.floor(Math.random() * possiblePasswords.length);

  // Repeat until we find an index with dud password.
  while (possiblePasswords[dudIndex].word === correctPassword) {
    dudIndex = Math.floor(Math.random() * possiblePasswords.length);
  }

  // Remove dud from possible passwords and return it.
  return possiblePasswords.splice(dudIndex, 1)[0];
}


/**
 * Removes a dud password and replaces it with dot letters.
 * If dud is falsy, does nothing.
 * @param {*} dud Password to be removed.
 */
function removePassword(dud) {
  if (!dud) {
    return;
  }

  // Create dot characters.
  for(let i = 0; i < dud.word.length; i++) {
    const dot = $('<span class="letter">.</span>');
    dot.insertAfter(dud.el);
  }

  // Remove the password.
  dud.el.remove();
}


/**
 * Called when user clicks a symbol.
 * @param {*} evt Click event.
 */
function onClick(evt) {
  // User is locked out, do nothing.
  if (isLocked) {
    return;
  }

  // Mouse is hovering over a code.
  else if (isCode) {
    evt.target.classList.add('used');
    appendHistory('>' + currentLetters.reduce((prev, cur) => prev + cur.textContent, ''));

    // 95% chance to remove a wrong password.
    if (Math.random() > 0.05) {
      const dudPass = getDudPassword();
      removePassword(dudPass);
      appendHistory('Removed dud');
      clearCode();
    } 
    
    // 5% chance to reset tries.
    else {
      attemptsLeft = MAX_ATTEMPTS;
      appendHistory('Tries reset');
      updateAttemptsLeft();
      clearCode();
    }
  } 
  
  // Mouse is hovering over a password.
  else if (isPassword) {

    // User guessed the password.
    if (correctPassword === currentPassword) {
      appendHistory('>' + currentPassword);
      appendHistory('Correct password!');
      setTimeout(() => {
        $('#hackable').hide();
        $('#unlocked').show();
      }, 1000);
    } 

    // User guessed wrong password.
    else {
      appendHistory('>' + currentPassword);
      appendHistory('Wrong password!');
      appendHistory('Similarity: ' + getSimilarity());
      attemptsLeft = Math.max(0, attemptsLeft - 1);
      isLocked = attemptsLeft <= 0;

      if (isLocked) {
        appendHistory('Too many login attempts!');
        setTimeout(() => {
          $('#locked').show();
          $('#hackable').hide();
        }, 1000);
      }

      updateAttemptsLeft();
    }
  }

  // Mouse is hovering over a symbol with no action linked on it.
  else {
    appendHistory('>' + evt.target.textContent);
    appendHistory('Unknown input');
  }
}


/**
 * Updates attempts-left counter.
 */
function updateAttemptsLeft() {
  const container = $('#attempts-left');
  container.text(`${attemptsLeft} / ${MAX_ATTEMPTS}`);
}


/**
 * Appends a line to history box.
 * Sanities line from HTML characters.
 * @param {string} line Line to record.
 */
function appendHistory(line) {
  history.push(escapeHtml(line));

  if (history.length > 16) {
    history.splice(0, 1);
  }

  updateHistory();
}


/**
 * Updates history lines.
 */
function updateHistory() {
  $('#history').html(history.join('<br>'));
}


/**
 * Called when user moves the mouse over a letter or a password.
 * @param {*} evt On enter event.
 */
function onEnter(evt) {
  evt.target.classList.add('hover');

  // User is hovering over a hacking code that has not been used.
  if (
    ['<', '[', '{', '('].includes(evt.target.textContent) && 
    !evt.target.classList.contains('used')
  ) {
      clearCode();
    
      // Store the first character element.
      currentLetters.push(evt.target);
    
      const currentChar = evt.target.textContent;
      
      // Loop siblings until we run out of them or we find matching bracket.
      let sibling = evt.target.nextSibling;
      while (sibling) {
        // Store characters while looping.
        currentLetters.push(sibling);
        
        // If we find the matching bracket, stop here.
        if (
          (currentChar === '<' && sibling.textContent === '>') ||
          (currentChar === '[' && sibling.textContent === ']') ||
          (currentChar === '(' && sibling.textContent === ')') ||
          (currentChar === '{' && sibling.textContent === '}')
        ) {
          isCode = true;
          break;
        }
    
        // Continue browsing siblings. The very last sibling will return
        // null for nextSibling.
        sibling = sibling.nextSibling;
      }
    
      // If we found a matching bracket, highlight all the characters.
      if (isCode) {
        currentLetters.forEach((el) => {
          el.classList.add('hover');
        });
      }
  } 
  
  // User is hovering over a password.
  else if (evt.target.classList.contains('password')) {
    evt.target.classList.add('hover');
    isPassword = true;
    currentPasswordEl = evt.target;
    currentPassword = evt.target.textContent;
  }
}


/**
 * Resets state for hack code and passwords.
 */
function clearCode() {
  currentLetters.forEach((el) => el.classList.remove('hover'));
  currentLetters = [];
  isCode = false;
  isPassword = false;
  currentPassword = null;
  currentPasswordEl = null;
}


/**
 * Called when user moves the mouse away from a letter or a password.
 * @param {*} evt On leave event.
 */
function onLeave(evt) {
  evt.target.classList.remove('hover');
  clearCode();
}


/**
 * Replaces unsafe HTML characters from the string.
 * @param {string} unsafe String to sanitize
 * @returns Returns HTML-safe string.
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/**
 * Selects a random word list.
 * @returns Returns a word list.
 */
function chooseRandomWordList() {
  const lengths = Object.keys(WORD_LISTS);
  const length = lengths[Math.floor(Math.random() * lengths.length)];
  return WORD_LISTS[length];
}


/**
 * Generates a random code.
 * @param {number} length Indicates how long the code should be.
 * @returns Returns generated code.
 */
function randomCode(length) {
  const characters = '.,:;"\'\\/|_-<>*+!?={[()]}@';
  let code = '';
  let currentLength = 0;

  // Build string until we hit length.
  while (currentLength < length) {
    code += '<span class="letter">' + escapeHtml(characters.charAt(Math.floor(Math.random() * characters.length))) + '</span>';
    currentLength += 1;
  }

  return code;
}


/**
 * Generates a random integer from range between min and max.
 * @param {number} min Smallest possible number.
 * @param {number} max Largest possible number.
 * @returns Returns a random integer number.
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


/**
 * Reset everything.
 */
function resetEverything() {
  const container = $('#hack-screen');
  container.children().remove();
  rows = [];
  history = [];
  possiblePasswords = [];
  isCode = false;
  isPassword = false;
  isLocked = false;
  currentPassword = null;
  currentPasswordEl = null;
  dictionary = chooseRandomWordList(WORD_LISTS);
  correctPassword = null;
  attemptsLeft = MAX_ATTEMPTS;

  $('#difficulty-screen').show();
  $('#hackable, #locked, #unlocked').hide();
  updateHistory();
}


// Entry point. Setup listeners and populate difficulty choices.
$(() => {
  const list = $('#difficulty');
  Array.from(Object.keys(WORD_LISTS)).forEach((diff) => {
    list.append(`<option value="${diff}">${diff}</option>`);
  });

  const container = $('#hack-screen');
  container.on('mouseenter', '.letter, .password', onEnter);
  container.on('mouseleave', '.letter, .password', onLeave);
  container.on('click', '.letter, .password', onClick);

  $('.again-btn').click(() => {
    console.log('Reset!');
    resetEverything();
  });
  
  $('#start').click(() => {
    console.log('Start!');
    $('#hackable').show();
    $('#difficulty-screen').hide();
    run();
  });
});
