import { Sendable } from '../../models/Sendable';
import { TaskBuilder } from '../../models/TaskBuilder';
import { htmlToElement } from '../../utils/dom';
import { Parser } from '../Parser';

export class NowCoderProblemParser extends Parser {
  public getMatchPatterns(): string[] {
    return [
      'https://ac.nowcoder.com/acm/problem/*',
      'https://ac.nowcoder.com/acm/contest/*/*',
      'https://ac.nowcoder.com/pat/*/problem/*',
    ];
  }

  public async parse(url: string, html: string): Promise<Sendable> {
    const elem = htmlToElement(html);
    const task = new TaskBuilder('NowCoder').setUrl(url);

    if (url.includes('/acm/')) {
      this.parseACM(elem, url, task);
    } else {
      this.parsePAT(elem, url, task);
    }

    return task.build();
  }

  private parseACM(elem: Element, url: string, task: TaskBuilder): void {
    task.setName(elem.querySelector('.terminal-topic-title').textContent.trim(), this.extractProblemId(url));

    const timeLimitStr = elem.querySelector('.question-intr > .subject-item-wrap > span').textContent.split('，').pop();
    task.setTimeLimit(parseInt(/(\d+)/.exec(timeLimitStr)[1], 10) * 1000);

    const memoryLimitStr = elem
      .querySelector('.question-intr > .subject-item-wrap > span:nth-of-type(2)')
      .textContent.split('，')
      .pop();
    task.setMemoryLimit(parseInt(/(\d+)/.exec(memoryLimitStr)[1], 10));

    elem.querySelectorAll('.question-oi-bd').forEach(tests => {
      const blocks = tests.querySelectorAll('pre');
      task.addTest(blocks[0].textContent, blocks[1].textContent);
    });
  }

  private parsePAT(elem: Element, url: string, task: TaskBuilder): void {
    task.setName(this.extractProblemId(url) ,elem.querySelector('.pat-content h3').textContent.trim().split(' (')[0]);

    const limitsStr = elem.querySelector('.pat-content .pat-detail-info').textContent;
    task.setTimeLimit(parseInt(/(\d+) ms/.exec(limitsStr)[1]));
    task.setMemoryLimit(parseInt(/(\d+) KB/.exec(limitsStr)[1], 10) / 1024);

    const blocks = [...elem.querySelectorAll('.module-body h3 > b')]
      .filter(el => el.textContent.includes('子:'))
      .map(el => el.parentElement.nextElementSibling);

    for (let i = 0; i < blocks.length - 1; i += 2) {
      task.addTest(blocks[i].innerHTML, blocks[i + 1].innerHTML);
    }
  }

  private extractProblemId(url: string): string {
    // 匹配比赛题目格式：/contest/99458/A
    const contestMatch = url.match(/\/contest\/(\d+)\/([A-Z])/);
    if (contestMatch) {
      return `${contestMatch[1]}-${contestMatch[2]}`; // 返回格式：99458-A
    }
    
    // 匹配其他题目格式
    const problemMatch = url.match(/problem\/(\d+)/);
    if (problemMatch) {
      return problemMatch[1];
    }
    
    return 'Unknown Id';
  }
}
