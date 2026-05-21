const sampleMappings = [
  {
    id: 'sample-coil-1',
    enabled: true,
    targetPath: 'sample.coil1',
    source: {
      regType: 'coil',
      protocolAddress: 0,
    },
    transform: {
      type: 'boolean',
    },
    fallbackValue: false,
  },
  {
    id: 'sample-discrete-input-1',
    enabled: true,
    targetPath: 'sample.discreteInput1',
    source: {
      regType: 'discreteInput',
      protocolAddress: 0,
    },
    transform: {
      type: 'boolean',
    },
    fallbackValue: false,
  },
];

const bridgeDefaultConfig = {
  includeTimestamp: true,
  mappings: sampleMappings,
};

export {
  sampleMappings,
  bridgeDefaultConfig,
};
