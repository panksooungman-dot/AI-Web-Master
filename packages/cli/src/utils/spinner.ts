import ora, { Ora } from "ora";

export class Spinner {
  private spinner: Ora;

  constructor(text: string = "Loading...") {
    this.spinner = ora({
      text,
      spinner: "dots",
      color: "cyan"
    });
  }

  start(text?: string): void {
    if (text) {
      this.spinner.text = text;
    }
    this.spinner.start();
  }

  stop(): void {
    this.spinner.stop();
  }

  succeed(text?: string): void {
    this.spinner.succeed(text);
  }

  fail(text?: string): void {
    this.spinner.fail(text);
  }

  warn(text?: string): void {
    this.spinner.warn(text);
  }

  info(text?: string): void {
    this.spinner.info(text);
  }

  setText(text: string): void {
    this.spinner.text = text;
  }

  static create(text: string): Spinner {
    return new Spinner(text);
  }
}