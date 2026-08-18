import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { BuccNetwork, type BuccNetworkInputs } from "@repo/bucc-infra";

import type { AwsFoundationConfig } from "./config/schema.js";
import { childOptions, tags } from "./shared.js";

export class AwsBuccNetwork extends BuccNetwork {
  readonly networkRef: pulumi.Output<string>;
  readonly privateSubnetRefs: pulumi.Output<readonly string[]>;
  readonly apiSecurityGroupRef: pulumi.Output<string>;
  readonly databaseSecurityGroupRef: pulumi.Output<string>;

  constructor(
    name: string,
    inputs: BuccNetworkInputs,
    config: AwsFoundationConfig,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(name, inputs, opts);
    const resourceTags = tags(inputs.name);
    const [firstOctet, secondOctet] = config.vpcCidr.split(".");
    const vpc = new aws.ec2.Vpc(
      `${name}-vpc`,
      {
        cidrBlock: config.vpcCidr,
        enableDnsSupport: true,
        enableDnsHostnames: true,
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    const subnetA = new aws.ec2.Subnet(
      `${name}-private-a`,
      {
        vpcId: vpc.id,
        cidrBlock: `${firstOctet}.${secondOctet}.1.0/24`,
        availabilityZone: `${inputs.region}a`,
        mapPublicIpOnLaunch: false,
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    const subnetB = new aws.ec2.Subnet(
      `${name}-private-b`,
      {
        vpcId: vpc.id,
        cidrBlock: `${firstOctet}.${secondOctet}.2.0/24`,
        availabilityZone: `${inputs.region}b`,
        mapPublicIpOnLaunch: false,
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    const routeTable = new aws.ec2.RouteTable(
      `${name}-private-routes`,
      { vpcId: vpc.id, routes: [], tags: resourceTags },
      childOptions(this, opts),
    );
    for (const [suffix, subnet] of [
      ["a", subnetA],
      ["b", subnetB],
    ] as const) {
      new aws.ec2.RouteTableAssociation(
        `${name}-private-${suffix}-routes`,
        { routeTableId: routeTable.id, subnetId: subnet.id },
        childOptions(this, opts),
      );
    }

    const apiSecurityGroup = createEmptySecurityGroup(
      `${name}-api-clients`,
      vpc.id,
      resourceTags,
      this,
      opts,
    );
    const databaseSecurityGroup = createEmptySecurityGroup(
      `${name}-database`,
      vpc.id,
      resourceTags,
      this,
      opts,
    );
    const endpointSecurityGroup = createEmptySecurityGroup(
      `${name}-endpoints`,
      vpc.id,
      resourceTags,
      this,
      opts,
    );

    new aws.vpc.SecurityGroupIngressRule(
      `${name}-database-from-api`,
      {
        securityGroupId: databaseSecurityGroup.id,
        referencedSecurityGroupId: apiSecurityGroup.id,
        ipProtocol: "tcp",
        fromPort: 5432,
        toPort: 5432,
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    new aws.vpc.SecurityGroupEgressRule(
      `${name}-api-to-database`,
      {
        securityGroupId: apiSecurityGroup.id,
        referencedSecurityGroupId: databaseSecurityGroup.id,
        ipProtocol: "tcp",
        fromPort: 5432,
        toPort: 5432,
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    new aws.vpc.SecurityGroupIngressRule(
      `${name}-endpoints-from-api`,
      {
        securityGroupId: endpointSecurityGroup.id,
        referencedSecurityGroupId: apiSecurityGroup.id,
        ipProtocol: "tcp",
        fromPort: 443,
        toPort: 443,
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    new aws.vpc.SecurityGroupEgressRule(
      `${name}-api-to-endpoints`,
      {
        securityGroupId: apiSecurityGroup.id,
        referencedSecurityGroupId: endpointSecurityGroup.id,
        ipProtocol: "tcp",
        fromPort: 443,
        toPort: 443,
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    for (const protocol of ["tcp", "udp"] as const) {
      new aws.vpc.SecurityGroupEgressRule(
        `${name}-api-dns-${protocol}`,
        {
          securityGroupId: apiSecurityGroup.id,
          cidrIpv4: config.vpcCidr,
          ipProtocol: protocol,
          fromPort: 53,
          toPort: 53,
          tags: resourceTags,
        },
        childOptions(this, opts),
      );
    }

    new aws.ec2.VpcEndpoint(
      `${name}-secrets-manager`,
      {
        vpcId: vpc.id,
        serviceName: `com.amazonaws.${inputs.region}.secretsmanager`,
        vpcEndpointType: "Interface",
        subnetIds: [subnetA.id, subnetB.id],
        securityGroupIds: [endpointSecurityGroup.id],
        privateDnsEnabled: true,
        tags: resourceTags,
      },
      childOptions(this, opts),
    );

    this.networkRef = vpc.id;
    this.privateSubnetRefs = pulumi.all([subnetA.id, subnetB.id]);
    this.apiSecurityGroupRef = apiSecurityGroup.id;
    this.databaseSecurityGroupRef = databaseSecurityGroup.id;
    this.registerOutputs({
      networkRef: this.networkRef,
      privateSubnetRefs: this.privateSubnetRefs,
      apiSecurityGroupRef: this.apiSecurityGroupRef,
      databaseSecurityGroupRef: this.databaseSecurityGroupRef,
    });
  }
}

function createEmptySecurityGroup(
  name: string,
  vpcId: pulumi.Input<string>,
  resourceTags: Record<string, string>,
  parent: pulumi.ComponentResource,
  opts?: pulumi.ComponentResourceOptions,
): aws.ec2.SecurityGroup {
  return new aws.ec2.SecurityGroup(
    name,
    { vpcId, ingress: [], egress: [], tags: resourceTags },
    childOptions(parent, opts),
  );
}
