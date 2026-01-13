import { LicensingClient } from "@/components/administration/licensing-client"

export default function LicensingPage() {
    // Pass platform configuration to client component
    const hasVBR = !!process.env.VEEAM_API_URL
    const hasVB365 = !!process.env.VBM_API_URL

    return <LicensingClient hasVBR={hasVBR} hasVB365={hasVB365} />
}
