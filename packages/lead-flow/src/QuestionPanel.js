import { QuestionFlow } from './QuestionFlow.js';

/**
 * Draws the form's questions into the host element and reports answers.
 * Choice questions become a select; everything else a text box. Picking an
 * option on the standard question swaps in that option's follow-up questions.
 */
export class QuestionPanel {
  /**
   * @param {object} deps
   * @param {HTMLElement} deps.host
   * @param {(answer: object) => void} deps.onAnswer  called when a question is answered or its answer changes
   */
  constructor({ host, onAnswer }) {
    this.host = host;
    this.onAnswer = onAnswer;
    this.doc = host.ownerDocument;
    this.flow = new QuestionFlow();
    this.values = new Map(); // questionId → picked optionId or typed text
    this.standardOptionId = null;
  }

  setFlow(flow) {
    this.flow = flow;
    this.render();
  }

  /** Ids of every question currently shown, in order. */
  questionIds() {
    return this.flow.visible(this.standardOptionId).map((question) => question.id);
  }

  /** Payloads for every visible question that has an answer, in display order. */
  answers() {
    return this.flow.visible(this.standardOptionId)
      .map((question) => QuestionFlow.answerFor(question, this.values.get(question.id)))
      .filter(Boolean);
  }

  render() {
    this.host.replaceChildren(...this.flow.visible(this.standardOptionId).map((question) => this.#field(question)));
  }

  #field(question) {
    const doc = this.doc;
    const id = `pk-q-${question.id}`;
    const label = doc.createElement('label');
    label.className = 'pk-sr-only';
    label.htmlFor = id;
    label.textContent = question.title || 'Question';

    const choice = question.options?.length && (question.isStandard || ['ONE_OF_MANY', 'DROPDOWN'].includes(question.questionCategory));
    const input = choice ? this.#select(question, id) : this.#text(question, id);

    const wrap = doc.createElement('div');
    wrap.className = 'pk-field';
    wrap.dataset.questionId = String(question.id);
    wrap.append(label, input);
    return wrap;
  }

  #select(question, id) {
    const doc = this.doc;
    const select = doc.createElement('select');
    select.id = id;
    select.name = id;
    const placeholder = doc.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.textContent = question.title || 'Select an option';
    select.append(placeholder, ...question.options.map((o) => {
      const option = doc.createElement('option');
      option.value = String(o.optionId);
      option.textContent = o.title;
      return option;
    }));
    select.value = this.values.get(question.id) ?? '';
    select.addEventListener('change', () => {
      this.values.set(question.id, select.value);
      if (question.isStandard) {
        this.standardOptionId = select.value;
        this.render();
      }
      this.onAnswer(QuestionFlow.answerFor(question, select.value));
    });
    return select;
  }

  #text(question, id) {
    const input = this.doc.createElement('input');
    input.id = id;
    input.name = id;
    input.type = 'text';
    input.placeholder = question.placeholderText || question.title || '';
    input.value = this.values.get(question.id) ?? '';
    input.addEventListener('input', () => this.values.set(question.id, input.value));
    // "change" fires when the person leaves the box, so one answer is sent, not one per keystroke.
    input.addEventListener('change', () => {
      const answer = QuestionFlow.answerFor(question, input.value);
      if (answer) this.onAnswer(answer);
    });
    return input;
  }
}
