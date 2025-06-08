import { Sendable } from '../../models/Sendable';
import { TaskBuilder } from '../../models/TaskBuilder';
import { htmlToElement } from '../../utils/dom';
import { Parser } from '../Parser';

export class AtCoderProblemParser extends Parser {
  public getMatchPatterns(): string[] {
    return ['https://atcoder.jp/contests/*/tasks/*'];
  }

  public async parse(url: string, html: string): Promise<Sendable> {
    const elem = htmlToElement(html);
    const task = new TaskBuilder('AtCoder').setUrl(url);

    const name = [...elem.querySelector('.h2').childNodes]
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent)
      .join('')
      .trim();

    task.setName(name, name);
    task.setCategory(elem.querySelector('.contest-title').textContent);

    const interactiveSentences = ['This is an interactive task', 'This is a reactive problem'];
    task.setInteractive(interactiveSentences.some(x => html.includes(x)));

    const limitText = elem.querySelector('#task-statement').previousElementSibling.textContent;

    task.setTimeLimit(parseFloat(/Time Limit: ([0-9.]+) ?sec/.exec(limitText)[1]) * 1000);
    task.setMemoryLimit(parseInt(/Memory Limit: (\d+) ?M[iI]?B/.exec(limitText)[1], 10));

    const getNextPre = (el: Element): Element | null => {
      let current = el.nextElementSibling;
      while (current && current.tagName !== 'PRE') {
        current = current.nextElementSibling;
      }
      return current;
    };

    const inputs = [...elem.querySelectorAll('h3')]
      .filter(el => el.textContent.includes('Sample Input') || el.textContent.includes('入力例'))
      .map(getNextPre)
      .filter(el => el !== null);

    const outputs = [...elem.querySelectorAll('h3')]
      .filter(el => el.textContent.includes('Sample Output') || el.textContent.includes('出力例'))
      .map(getNextPre)
      .filter(el => el !== null);

    const addedTests = new Set<string>();
    for (let i = 0; i < inputs.length && i < outputs.length; i++) {
      const inputContent = inputs[i].textContent;
      const outputContent = outputs[i].textContent;
      
      const testKey = JSON.stringify({ input: inputContent, output: outputContent });

      if (!addedTests.has(testKey)) {
        task.addTest(inputContent, outputContent);
        addedTests.add(testKey);
      }
    }

    return task.build();
  }
}