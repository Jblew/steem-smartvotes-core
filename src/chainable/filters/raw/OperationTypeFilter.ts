import { RawOperation, CustomJsonOperation } from "../../../types/blockchain-operations-types";
import { ChainableFilter } from "../../Chainable";

/**
 * Filters steem blockchain operations by type.
 */
export class OperationTypeFilter extends ChainableFilter<RawOperation, OperationTypeFilter> {
    private typeName: string;

    constructor(typeName: string) {
        super();
        this.typeName = typeName;
    }

    protected me(): OperationTypeFilter {
        return this;
    }

    public take(error: Error | undefined, rawOp: RawOperation): boolean {
        if (error) throw error;
        if (rawOp[1].op[0] == this.typeName) {
            return this.give(undefined, rawOp);
        }
        else return true;
    }
}