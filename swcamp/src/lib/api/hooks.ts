import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
export function useAccounts() {
    return useQuery({
        queryKey: ["accounts"],
        queryFn: () => api<Array<{ bank: string; no: string }>>("/v1/banking/accounts"),
    });
}