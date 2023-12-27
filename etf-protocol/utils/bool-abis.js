const ANCHOR_ABI = [
    "function consumer() view returns (address)",
    "function isPathEnabled(uint32) view returns (bool)",
    "function fetchRemoteAnchor(uint32) view returns (bytes32)",
    "function manager() view returns (address)",
    "function updateConsumer(address newConsumer)",
    "function batchUpdateRemoteAnchors(uint32[] calldata remoteChainIds,bytes32[] calldata remoteAnchors)",
]
