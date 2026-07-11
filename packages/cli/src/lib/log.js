const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  boldCyan: "\x1b[1;36m",
  boldYellow: "\x1b[1;33m",
};

function color(text, name) {
  if (process.env.NO_COLOR) return text;
  return `${colors[name]}${text}${colors.reset}`;
}

const log = {
  title(text) {
    console.log("");
    console.log(color("====================================", "cyan"));
    console.log(color(text, "cyan"));
    console.log(color("====================================", "cyan"));
  },
  info(text) {
    console.log(color(text, "cyan"));
  },
  ok(label, detail = "") {
    console.log(`${color("✅", "green")} ${label.padEnd(14)} ${detail}`);
  },
  warn(label, detail = "") {
    console.log(`${color("⚠️ ", "yellow")} ${label.padEnd(14)} ${detail}`);
  },
  error(label, detail = "") {
    console.log(`${color("❌", "red")} ${label.padEnd(14)} ${detail}`);
  },
  dim(text) {
    console.log(color(text, "gray"));
  },
};

export { log, color };
