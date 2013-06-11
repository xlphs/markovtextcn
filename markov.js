/*
 * Markov Chinese Text Generator
 * Author: Marika Wei
 * Adapted from: http://allanwirth.com/javascript/markov.js,
 * by Allan Wirth <allanlw@gmail.com>.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/**
 * MarkovChain is a class that represents a markov chain. Created in a wrapper
 * function so there is a private namespace that contains the MarkovWord and
 * MarkovState helper classes without actually having them in the class itself.
 */
var MarkovChain = (function() {
	"use strict";
	var newClass = Class.create,
	/**
	 * A class for representing a word in a markov chain. The word is ideally
	 * represented regardless of punctuation and then the
	 * punctuation/capitalization is added afterwards.
	 * 
	 * @param name
	 *            The first value of the word.
	 */
	MarkovWord = newClass({
		initialize : function(name) {
			var i, character, chars = [];
			for (i = 0; i < name.length; i++) {
				character = name.charAt(i);
				if (character >= "A" && character <= "Z") {
					chars.push(character.toLowerCase());
				} else if (character >= "a" && character <= "z") {
					chars.push(character);
				} else {
					chars.push(character);
				}
			}
			this.name = chars.join();
			this.versions = [ [ name, 1.0 ] ];
			this.numInstances = 1;
		},
		getName : function() {
			return this.name;
		},
		/**
		 * Adds a version of the word to the versions.
		 * 
		 * @param name
		 *            the version of the word to add.
		 */
		addVersion : function(name) {
			var set = false, i, oldValue;
			for (i = 0; i < this.versions.length; i++) {
				oldValue = this.versions[i][1] * this.numInstances;
				if (this.versions[i][0] === name) {
					oldValue++;
					set = true;
				}
				this.versions[i][1] = oldValue / (this.numInstances + 1);
			}
			this.numInstances++;
			if (!set) {
				this.versions.push([ name, 1.0 / (this.numInstances) ]);
			}
		},
		/**
		 * Gets a version of the word at random based on probabilities
		 * calculated in addVersion
		 * 
		 * @returns a version of the word.
		 */
		getValue : function() {
			var selection = Math.random(), i, processed;
			for (i = 0, processed = 0.0; i < this.versions.length; i++) {
				processed += this.versions[i][1];
				if (processed >= selection) {
					return this.versions[i][0];
				}
			}
			return this.versions[this.versions.length - 1][0];
		}
	}),
	/**
	 * Represents an state in a markov chain. This contains n words, and
	 * contains pointers to the next possible words along with their respective
	 * probabilities. The special null word represents the end of the
	 * sentence/phrase.
	 * 
	 * @param words
	 *            Words for the state.
	 */
	MarkovState = newClass({
		initialize : function(words) {
			this.words = $A(words);
			this.options = 0;
			this.nextWords = [];
			this.hash = this.words.collect(function(s) {
				return s.getName();
			}).join("_");
		},
		getHash : function() {
			return this.hash;
		},
		getWords : function() {
			return this.words;
		},
		/**
		 * Adds a word to the possibilities for the next word in the sentence.
		 * If the word is already listed as a possibility, the probability for
		 * it increases, and the probability for all the others decreases. If it
		 * isn't listed as a possibility, the probabilities for all the current
		 * possibilities decreases and it is added.
		 * 
		 * @param word
		 *            An instance of MarkovWord to add to the possible next
		 *            words.
		 */
		addNext : function(word) {
			var set = false, i, oldValue;
			for (i = 0; i < this.nextWords.length; i++) {
				oldValue = this.nextWords[i][1] * this.options;
				if (!set
						&& ((word === null && this.nextWords[i][0] === null) || (word !== null
								&& this.nextWords[i][0] !== null && this.nextWords[i][0]
								.getName() === word.getName()))) {
					oldValue += 1;
					set = true;
				}
				this.nextWords[i][1] = oldValue / (this.options + 1.0);
			}
			this.options += 1.0;
			if (!set) {
				this.nextWords.push([ word, 1 / this.options ]);
			}
		},
		/**
		 * Randomly gets the next word in the sentence based on the
		 * probabilities that were calculated during calls to addNext()
		 * 
		 * @returns An instance of MarkovWord representing the next word in the
		 *          sentence.
		 */
		getNext : function() {
			var selection = Math.random(), i, processed;
			for (i = 0, processed = 0.0; i < this.nextWords.length; i++) {
				processed += this.nextWords[i][1];
				if (processed >= selection) {
					return this.nextWords[i][0];
				}
			}
			return this.nextWords[this.nextWords.length - 1][0];
		}
	}),
	/**
	 * The actual MarkovChain class.
	 * 
	 * @param order
	 *            The order of the Markov chain. This is the number of words
	 *            that are used to represent each unique state.
	 */
	MarkovChain = newClass({
		initialize : function(order) {
			this.order = order;
			this.words = $H();
			this.states = $H();
		},
		/**
		 * Returns the instance of MarkovWord matching the specified name. If
		 * add is true then it adds it as a version to that node.
		 * 
		 * @param name
		 *            A String representing the name of the MarkovWord.
		 * @param add
		 *            Add the word as a version to the MarkovWord instance
		 *            and/or add a new MarkovWord to the list of words if it
		 *            does not exist.
		 * @returns The MarkovWord instance.
		 */
		getWord : function(name, add) {
			var markov = new MarkovWord(name), word = this.words.get(markov
					.getName());
			if (typeof word !== "undefined") {
				if (add) {
					word.addVersion(name);
				}
				return word;
			} else if (add) {
				this.words.set(markov.getName(), markov);
				return markov;
			} else {
				return null;
			}
		},
		getRandomState : function() {
			var id = Math.floor(this.states.size() * Math.random());
			return this.states.get(this.states.keys()[id]);
		},
		createSentence : function() {
			var sentence = this.getRandomState().getWords(), words, nextWord;
			while (true) {
				words = sentence.slice(-this.order);
				nextWord = this.getState(words).getNext();
				if (nextWord === null) {
					break;
				} else {
					sentence.push(nextWord);
				}
			}
			var output = sentence.collect(function(a) {
				return a.getValue();
			}).join("") + String.fromCharCode(0x3002); // append full-width period
			
			// occasionally the first chart is a comma, remove it
			if (output[0] == "\uFF0C") {
				output = output.substring(1);
			}
			return output;
		},
		/**
		 * Get a state from an array of words. Creates the state if it does not
		 * exist.
		 * 
		 * @param words
		 *            An array of MarkovWords.
		 * @returns A MarkovState.
		 */
		getState : function(words) {
			var state = new MarkovState(words), value = this.states.get(state
					.getHash());
			if (typeof value === "undefined") {
				this.states.set(state.getHash(), state);
				return state;
			} else {
				return value;
			}
		},
		getNumWords : function() {
			return this.words.size();
		},
		getNumStates : function() {
			return this.states.size();
		}
	});
	/**
	 * Creates a new MarkovChain from a block of prose.
	 * 
	 * @param text
	 *            The text to create the chain (for sentences) from.
	 * @param order
	 *            The order of the states in the chain (e.g. the number of
	 *            previous words that affect the next word choice)
	 * @returns A new markov chain.
	 */
	MarkovChain.fromText = function(text, order) {
		var chain = new MarkovChain(order), words = [], wordScanIterator = function(
				match) {
			// add every character
			for (var k=0; k<match[0].length; k++) {
				words.push(match[0][k]);
			}
		},
		// split by punctuations: .!? and full-width version of .!?
		sentences = text.split(/[.!?\u3002\uFF01\uFF1F]/), i, j, phrase, next;
		for (i = 0; i < sentences.length; i++) {
			words = [];
			// specify allowed characters
			// allow comma because Chinese is not space delimited
			sentences[i].scan(/[A-Za-z\u4E00-\u9FCC0-9_'\-\uFF0C]+/, wordScanIterator);
			for (j = 0; j < words.length; j++) {
				words[j] = chain.getWord(words[j], true);
			}
			for (j = order - 1; j < words.length; j++) {
				phrase = words.slice(j - order + 1, j + 1);
				next = (j === words.length - 1) ? null : words[j + 1];
				chain.getState(phrase).addNext(next);
			}
		}
		return chain;
	};
	return MarkovChain;
})();