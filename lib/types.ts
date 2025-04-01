export interface PayUQRRequestParams {
  txnid: string
  amount: string
  productinfo: string
  firstname: string
  email: string
  phone: string
  pg?: string
  bankcode?: string
  s2s_client_ip: string
  s2s_device_info: string
  txn_s2s_flow?: string
  expiry_time?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  country?: string
  zipcode?: string
  udf1?: string
  udf2?: string
  udf3?: string
  udf4?: string
  udf5?: string
}

export interface PayUQRResponse {
  metaData: {
    message: string | null
    referenceId: string
    statusCode: string | null
    txnId: string
    txnStatus: string
    unmappedStatus: string
  }
  result: {
    paymentId: string
    merchantName: string
    merchantVpa: string
    amount: string
    qrString: string
    otpPostUrl: string
  }
}

