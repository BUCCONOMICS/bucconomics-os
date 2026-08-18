# @repo/bucc-infra

Cloud-neutral infrastructure contracts and stack composition for BUCC.

## Design

- The package is private, ESM-only, and intended to be consumed by concrete cloud implementation packages.
- It defines eight stable Pulumi `ComponentResource`-based contracts:
  - `BuccStateBackend`
  - `BuccNetwork`
  - `BuccKeyring`
  - `BuccDatabase`
  - `BuccStorage`
  - `BuccApi`
  - `BuccReviewAgent`
  - `BuccMonitoring`
- Contracts expose only opaque resource and secret references, never raw passwords or secret values.
- Stack composition is factory-driven through an explicit `BuccImplementationSet` object; no dynamic imports are used.
- Contract classes are abstract: cloud implementations must create their provider resources, assign every declared output, register those outputs, and parent child resources to the component.

## State backend bootstrap

The state backend is intentionally a two-phase responsibility:

1. A cloud implementation must create the backend that will store Pulumi state and locking metadata.
2. The remaining BUCC resources can then be provisioned using that backend as the foundational dependency.

This package defines the contract and the composition order, but it does not provide a runnable cloud implementation or `Pulumi.yaml`.
