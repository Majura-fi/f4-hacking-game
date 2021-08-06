# Fallout 4 hacking mini game
This is my personal (6 hour) attempt at making Fallout 4 hacking mini game, powered with HTML and javascript. (Used later couple hours more to clean up a little bit.)

The main focus of this project was to get the game play logic to work. The game does not behave exactly like the fallout one, but is very close to the original.

I chose HTML and javascript, because they were easy to setup with minimal requirements and allowed me to jump into prototyping instantly.


# Requirements
The only requirements for this project are jQuery >= 3.6.0, which is already included in index.html as an external script, and a modern browser.


# How to play
Download the repository on your computer and open index.html in your browser. The game is tested on Firefox 90.0.2 64-bit.


# Custom word lists
The word list is a single javascript file, that creates a global variable containing word lists. 

The default word list is similar to that of the game. The list is collected from [here](https://www.reddit.com/r/Fallout/comments/75ma3j/all_possible_words_in_the_hacking_minigame_found/).

When making custom word lists, _make sure that each word list has words that all have same lengths._

# Screenshots
![image](https://user-images.githubusercontent.com/12672127/128544125-209c774b-9565-4f4e-ab25-1e381a95703b.png)

Settings can be shown or use hard-coded values via options-object.

![image](https://user-images.githubusercontent.com/12672127/128539522-b22f00cb-42fe-469c-8037-93b4161916ed.png)

The game screen.

![image](https://user-images.githubusercontent.com/12672127/128539576-1bd555bc-8d74-42c5-bf44-6de4d99d7f86.png)

Input updates on mouse hover.

![image](https://user-images.githubusercontent.com/12672127/128539790-9bdbc38b-d1a7-4c7b-bf6c-d4f5ca5db9bb.png)

Hack code either removes a dud or resets tries.

![image](https://user-images.githubusercontent.com/12672127/128539962-cb893891-0983-4ea9-80c0-03398b027241.png)

Similarity scoring works like in the original game.

![image](https://user-images.githubusercontent.com/12672127/128540032-64265aec-968e-4ae0-9ca2-3c4cb5730062.png)

Unlock the 'terminal' when guessing the correct password, get locked out when failing five times.
