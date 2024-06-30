import { useState } from 'react';
import './App.css';
import { tickers } from './assets/tickers_array';
function App() {
  const [inputValue, setInputValue] = useState('');
  const [thiccifiedValue, setThiccifiedValue] = useState('');
  const handleInputChange = (event: any) => {
    setInputValue(event.target.value);
  };

  const thiccifySentence = () => {
    // Create a regex pattern to match any of the words
    // Sort words by length in descending order to avoid partial matches
    const allTickers = tickers;
    allTickers.sort((a, b) => b.length - a.length);
    let sentence = inputValue;

    // Iterate over each word and replace it in the sentence
    tickers.forEach((word) => {
      const pattern = new RegExp(`\\b${word}`, 'gi');
      sentence = sentence.replace(
        pattern,
        (match) => `$${match.toUpperCase()} `
      );
    });

    setThiccifiedValue(sentence.replace(/\$\$/g, '$'));
  };

  return (
    <>
      <div>
        <a href="https://reddit.com/r/Superstonk" target="_blank">
          <img src="https://pbs.twimg.com/media/GPfKqJ-XEAAhj-N.png" />
        </a>
      </div>
      <div className="card">
        <textarea
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Sentence to thiccify..."
          style={{
            height: '200px',
            fontSize: '14pt',
          }}
        />
      </div>
      <div className="card">
        <button onClick={() => thiccifySentence()}>
          <h1>THICCIFY your sentence</h1>
        </button>
      </div>
      <div className="card">
        {!thiccifiedValue && <h1>Your thiccified sentence</h1>}
        {thiccifiedValue && <h1>{thiccifiedValue}</h1>}
      </div>
    </>
  );
}

export default App;
