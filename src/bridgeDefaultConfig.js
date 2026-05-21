function createBooleanMapping({
  id,
  targetPath,
  regType,
  protocolAddress,
}) {
  return {
    id,
    enabled: true,
    targetPath,
    source: {
      regType,
      protocolAddress,
    },
    transform: {
      type: 'boolean',
    },
    fallbackValue: false,
  };
}

const sampleBooleanMappings = [
  createBooleanMapping({
    id: 'sample-coil-1',
    targetPath: 'sample.coil1',
    regType: 'coil',
    protocolAddress: 0,
  }),
  createBooleanMapping({
    id: 'sample-discrete-input-1',
    targetPath: 'sample.discreteInput1',
    regType: 'discreteInput',
    protocolAddress: 0,
  }),
];

const plumbingPumpStatusMappings = Array.from({ length: 11 }, (_, index) => {
  const pumpNumber = index + 1;
  const runAddress = index * 2;
  const faultAddress = runAddress + 1;

  return [
    createBooleanMapping({
      id: `plumbing-pump-${pumpNumber}-run`,
      targetPath: `plumbing.pumps.pump${pumpNumber}.run`,
      regType: 'discreteInput',
      protocolAddress: runAddress,
    }),
    createBooleanMapping({
      id: `plumbing-pump-${pumpNumber}-fault`,
      targetPath: `plumbing.pumps.pump${pumpNumber}.fault`,
      regType: 'discreteInput',
      protocolAddress: faultAddress,
    }),
  ];
}).flat();

const bridgeDefaultPresets = [
  {
    id: 'sample-boolean',
    label: 'Sample Boolean',
    description: '最小布林 mapping 範例，包含 Coil 與 Discrete Input。',
    mappings: sampleBooleanMappings,
  },
  {
    id: 'plumbing-pump-status',
    label: 'Plumbing Pump Status',
    description: '11 組 pump run / fault 狀態，對應 Discrete Input protocolAddress 0-21。',
    mappings: plumbingPumpStatusMappings,
  },
];

const sampleMappings = sampleBooleanMappings;

const bridgeDefaultConfig = {
  includeTimestamp: true,
  mappings: sampleMappings,
};

export {
  sampleBooleanMappings,
  plumbingPumpStatusMappings,
  bridgeDefaultPresets,
  sampleMappings,
  bridgeDefaultConfig,
};
