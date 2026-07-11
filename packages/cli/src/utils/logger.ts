import chalk from "chalk";

export class Logger {
  static info(message: string): void {
    console.log(chalk.cyan(`ℹ ${message}`));
  }

  static success(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  static warn(message: string): void {
    console.log(chalk.yellow(`⚠ ${message}`));
  }

  static error(message: string): void {
    console.error(chalk.red(`❌ ${message}`));
  }

  static debug(message: string): void {
    if (process.env.DEBUG === "true") {
      console.log(chalk.gray(`🐞 ${message}`));
    }
  }

  static title(title: string): void {
    console.log();
    console.log(chalk.bold.cyan(title));
    console.log(chalk.gray("================================"));
  }

  static separator(): void {
    console.log(chalk.gray("--------------------------------"));
  }
}