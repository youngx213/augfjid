package io.github.jeeanflores.bedrockBox.commands.completer;

import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class BedrockCommandCompleter implements TabCompleter {
    
    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        List<String> completions = new ArrayList<>();
        
        if (args.length == 1) {
            // First argument - subcommands
            List<String> subCommands = Arrays.asList(
                "create", "fill", "delete", "clear", "stop", 
                "autowin", "tnt", "fireworks", "tp", "info", "setblock"
            );
            
            for (String subCommand : subCommands) {
                if (subCommand.toLowerCase().startsWith(args[0].toLowerCase())) {
                    completions.add(subCommand);
                }
            }
        } else if (args.length == 2) {
            String subCommand = args[0].toLowerCase();
            
            switch (subCommand) {
                case "create":
                    // Suggest sizes
                    completions.addAll(Arrays.asList("5", "7", "9", "11", "13", "15"));
                    break;
                    
                case "fill":
                    // Suggest row counts
                    completions.addAll(Arrays.asList("1", "2", "3", "5", "10"));
                    break;
                    
                case "setblock":
                    // Suggest block types
                    completions.addAll(Arrays.asList("slime", "gold", "diamond", "default"));
                    break;
            }
        } else if (args.length == 3 && args[0].equalsIgnoreCase("create")) {
            // Height for create command
            completions.addAll(Arrays.asList("5", "7", "9", "11", "13", "15"));
        }
        
        return completions;
    }
}
