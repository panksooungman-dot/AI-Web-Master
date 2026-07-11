#!/usr/bin/env node

import { Command } from "commander";

import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { installCommand } from "./commands/install.js";
import { doctorCommand } from "./commands/doctor.js";
import { searchCommand } from "./commands/search.js";
import { removeCommand } from "./commands/remove.js";
import { updateCommand } from "./commands/update.js";
import { publishCommand } from "./commands/publish.js";

const program = new Command();

program
  .name("ai")
  .description("AI Business OS Command Line Interface")
  .version("1.1.0");

program
  .command("init")
  .argument("[project]", "Project name")
  .description("Initialize a new AI Business OS project")
  .action(async (project?: string) => {
    await initCommand(project);
  });

program
  .command("add")
  .argument("<package>", "Package name")
  .description("Add a package")
  .action(async (pkg: string) => {
    await addCommand(pkg);
  });

program
  .command("install")
  .argument("<package>", "Package name")
  .description("Install a package")
  .action(async (pkg: string) => {
    await installCommand(pkg);
  });

program
  .command("doctor")
  .description("Check the development environment")
  .action(async () => {
    await doctorCommand();
  });

program
  .command("search")
  .argument("<keyword>", "Search keyword")
  .description("Search available packages")
  .action(async (keyword: string) => {
    await searchCommand(keyword);
  });

program
  .command("remove")
  .argument("<package>", "Package name")
  .description("Remove an installed package")
  .action(async (pkg: string) => {
    await removeCommand(pkg);
  });

program
  .command("update")
  .argument("<package>", "Package name")
  .description("Update an installed package")
  .action(async (pkg: string) => {
    await updateCommand(pkg);
  });

program
  .command("publish")
  .argument("<package>", "Package name")
  .description("Publish a package")
  .action(async (pkg: string) => {
    await publishCommand(pkg);
  });

program.parseAsync(process.argv);