import React, { useState } from "react";
import toast from "react-hot-toast";

export default function FunctionEditor({ 
  isOpen, 
  onClose, 
  onSave, 
  functionData = null,
  availableSounds = [],
  onSoundUpload
}) {
  const [functionName, setFunctionName] = useState(functionData?.name || "Custom");
  const [hideInOverlay, setHideInOverlay] = useState(functionData?.hideInOverlay || false);
  const [repetition, setRepetition] = useState(functionData?.repetition || 1);
  const [delay, setDelay] = useState(functionData?.delay || 0);
  const [interval, setInterval] = useState(functionData?.interval || 100);
  const [repetitionMultiplier, setRepetitionMultiplier] = useState(functionData?.repetitionMultiplier || true);
  const [commands, setCommands] = useState(functionData?.commands || [""]);
  const [selectedSound, setSelectedSound] = useState(functionData?.sound || "default.mp3");
  const [volume, setVolume] = useState(functionData?.volume || 50);
  const [punishmentImage, setPunishmentImage] = useState(functionData?.punishmentImage || null);
  const [showSoundSelector, setShowSoundSelector] = useState(false);
  const [showPunishmentSelector, setShowPunishmentSelector] = useState(false);

  const handleSave = () => {
    if (!functionName.trim()) {
      toast.error("Please enter a function name");
      return;
    }

    const validCommands = commands.filter(cmd => cmd.trim().length > 0);
    if (validCommands.length === 0) {
      toast.error("Please enter at least one command");
      return;
    }

    const functionObj = {
      id: functionData?.id || Date.now().toString(),
      name: functionName.trim(),
      hideInOverlay,
      repetition: parseInt(repetition) || 1,
      delay: parseInt(delay) || 0,
      interval: parseInt(interval) || 100,
      repetitionMultiplier,
      commands: validCommands,
      sound: selectedSound,
      volume: parseInt(volume) || 50,
      punishmentImage,
      createdAt: functionData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(functionObj);
    onClose();
  };

  const addCommand = () => {
    setCommands([...commands, ""]);
  };

  const updateCommand = (index, value) => {
    const newCommands = [...commands];
    newCommands[index] = value;
    setCommands(newCommands);
  };

  const removeCommand = (index) => {
    if (commands.length > 1) {
      const newCommands = commands.filter((_, i) => i !== index);
      setCommands(newCommands);
    }
  };

  const handleSoundUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      onSoundUpload(file);
      setSelectedSound(file.name);
      toast.success(`Sound uploaded: ${file.name}`);
    } else {
      toast.error("Please select a valid audio file");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-cyan-500/20 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Select Function</h2>
            {functionData?.giftName && (
              <div className="text-purple-300 text-sm mt-1">
                🎁 Gift: {functionData.giftName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-300 text-2xl"
            >
              🗑️
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Function Configuration */}
        <div className="space-y-6">
          {/* Function Name */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              {functionData?.imageUrl ? (
                <img 
                  src={functionData.imageUrl} 
                  alt={functionData.giftName || "Gift"}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                <span className="text-white font-bold text-lg">⚡</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-white font-semibold mb-2">Function Name:</label>
              <input
                type="text"
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                placeholder="Enter function name"
              />
              {functionData?.giftName && (
                <div className="text-purple-300 text-sm mt-1">
                  This function will trigger when users send "{functionData.giftName}" gift on TikTok
                </div>
              )}
            </div>
          </div>

          {/* Overlay and Background Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={hideInOverlay}
                onChange={(e) => setHideInOverlay(e.target.checked)}
                className="rounded"
              />
              Hide Event In Overlay
            </label>
            
            <button
              onClick={() => setShowPunishmentSelector(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              <span>🏔️</span>
              Select Background
            </button>
          </div>

          {/* Repetition and Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-semibold mb-2">Repetition:</label>
              <input
                type="number"
                value={repetition}
                onChange={(e) => setRepetition(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                min="1"
              />
            </div>
            <div>
              <label className="block text-white font-semibold mb-2">Delay (ms):</label>
              <input
                type="number"
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                min="0"
              />
            </div>
            <div>
              <label className="block text-white font-semibold mb-2">Interval (ms):</label>
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                min="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={repetitionMultiplier}
                onChange={(e) => setRepetitionMultiplier(e.target.checked)}
                className="rounded"
              />
              <label className="text-white">Repetition multiplier</label>
              <span className="text-gray-400">?</span>
            </div>
          </div>

          {/* Commands Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                Commands {commands.length > 0 ? `${commands.filter(c => c.trim()).length}/${commands.length}` : '0'}
              </h3>
              <button
                onClick={() => setShowSoundSelector(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                ? Variables
              </button>
            </div>

            <div className="space-y-3">
              {commands.map((command, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="bg-gray-800 border border-gray-600 rounded p-3">
                      <label className="block text-gray-400 text-sm mb-1">#{index + 1} Command</label>
                      <input
                        type="text"
                        value={command}
                        onChange={(e) => updateCommand(index, e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                        placeholder="Enter command (e.g., bedrock tnt 1 {nickname})"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-8 h-8 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">
                      ▶️
                    </button>
                    <button className="w-8 h-8 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                      ▶️
                    </button>
                    <button
                      onClick={() => removeCommand(index)}
                      className="w-8 h-8 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addCommand}
              className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Add command +1
            </button>
          </div>

          {/* Sound Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-semibold mb-2">Sound:</label>
              <div className="flex gap-2">
                <select
                  value={selectedSound}
                  onChange={(e) => setSelectedSound(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                >
                  <option value="default.mp3">Default</option>
                  {availableSounds.map((sound, index) => (
                    <option key={index} value={sound.file}>
                      {sound.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowSoundSelector(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  🎵
                </button>
              </div>
            </div>
            <div>
              <label className="block text-white font-semibold mb-2">Volume: {volume}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Sound Upload */}
          <div>
            <label className="block text-white font-semibold mb-2">Upload Custom Sound:</label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleSoundUpload}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
