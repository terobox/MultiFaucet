import axios from "axios"; // Requests
import Image from "next/image"; // Image
import { ethers } from "ethers"; // Address check
import { toast } from "react-toastify"; // Toast notifications
import Layout from "components/Layout"; // Layout wrapper
import { useRouter } from "next/router"; // Router
import styles from "styles/Home.module.scss"; // Styles
import { ReactElement, useState } from "react"; // Local state + types
import { getAddressDetails } from "utils/addresses"; // Faucet addresses
import { hasClaimed } from "pages/api/claim/status"; // Claim status
import { signIn, getSession, signOut } from "next-auth/client"; // Auth

/**
 * Checks if a provider address or ENS name is valid
 * @param {string} address to check
 * @returns {boolean} validity
 */
export function isValidInput(address: string): boolean {
  // Check if valid email address
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(address);
}

export default function Home({
  session,
  claimed: initialClaimed,
}: {
  session: any;
  claimed: boolean;
}) {
  // Collect prefilled address
  const {
    query: { addr },
  } = useRouter();
  // Fill prefilled address

  const prefilledAddress: string = addr && typeof addr === "string" ? addr : "";
  const notify = (title:string)=>toast(title)
  // Claim address
  const [address, setAddress] = useState<string>(prefilledAddress);
  // Claimed status
  const [claimed, setClaimed] = useState<boolean>(initialClaimed);
  // First claim
  const [firstClaim, setFirstClaim] = useState<boolean>(false);
  // Loading status
  const [loading, setLoading] = useState<boolean>(false);
  // Claim other
  const [claimOther, setClaimOther] = useState<boolean>(false);

  // Collect details about addresses
  const { networkCount, sortedAddresses } = getAddressDetails();

  // 增加新的状态
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isVerificationSent, setVerificationSent] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  /**
   * Processes a claim to the faucet
   */
  const processClaim = async () => {
    setLoading(true);
  
    if (!isVerificationSent) {
      // 发送邮件验证码
      try {
        const response = await axios.post("http://194.163.137.80:3002/api/send_verification_code", { email: address }, { withCredentials: true });
        console.log("Server Response:", response.data);
        if (response.data.status === 1) {
          notify("验证码已发送至您的邮箱，请检查并输入")
          setVerificationSent(true);
          // setStatusMessage("验证码已发送至您的邮箱，请检查并输入");
        } else {
          notify("发送验证码失败，请重试")
          // setStatusMessage("发送验证码失败，请重试");
        }
      } catch (error) {
        console.error(error);
        notify("网络错误，请稍后重试")
        // setStatusMessage("网络错误，请稍后重试");
      }
    } else {
      // 验证用户输入的验证码
      try {
        const response = await axios.post("http://194.163.137.80:3002/api/verify_code", { 
          email: address, 
          code: verificationCode 
        });
        console.log("Server Response:", response.data);
        console.log("Server Response:", response.data);
        if (response.data.status === 1) {
          notify("邮箱成功收到token")
          console.log("Server Response:", response.data);
        } else {
          notify("验证码不正确，请重试")
          // setStatusMessage("验证码不正确，请重试");
        }
      } catch (error) {
        console.error(error);
        notify("网络错误，请稍后重试")
        // setStatusMessage("网络错误，请稍后重试");
      }
    }
  
    setLoading(false);
  };

  // 检查复选框
  const [isChecked, setIsChecked] = useState(true);  // 默认值设置为 true

  return (
    <Layout>
      {/* CTA + description */}
      <div className={styles.home__cta}>
        <div>
          <a
            href="https://openfox.cloud/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/logo.png" height="42.88px" width="180px" />
          </a>
        </div>
        <h1>ChatGPT API Faucet</h1>
      </div>

      {/* Claim from facuet card */}
      <div className={styles.home__card}>
      {/* Card title */}
      <div className={styles.home__card_title}>
        <h3>Request Tokens</h3>
      </div>

      {/* Card content */}
      <div className={styles.home__card_content}>
        {!session ? (
          <div className={styles.content__authenticated}>
            {claimed ? (
              <div className={styles.content__claimed}>
                <p>
                  {firstClaim
                    ? "You have successfully claimed tokens. You can request again in 24 hours."
                    : "You have already claimed tokens today. Please try again in 24 hours."}
                </p>
                <button className={styles.button__main} disabled>
                  Tokens Already Claimed
                </button>
              </div>
            ) : (
              <div className={styles.content__unclaimed}>
                <p>Enter your email address to receive a ChatGPT API token:</p>

                {/* 根据 isVerificationSent 状态切换输入框 */}
                <input
                  type="text"
                  placeholder={isVerificationSent ? "输入验证码" : "support@openfox.cloud"}
                  value={isVerificationSent ? verificationCode : address}
                  onChange={(e) => isVerificationSent ? setVerificationCode(e.target.value) : setAddress(e.target.value)}
                />

                <div className={styles.content__unclaimed_others}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => setIsChecked((previous) => !previous)}
                  />
                  <label>
                    I promise not to abuse the API.
                  </label>
                </div>

                {statusMessage && <p>{statusMessage}</p>}

                {isValidInput(address) ? (
                  isChecked ? (
                    <button
                      className={styles.button__main}
                      onClick={processClaim}
                      disabled={loading}
                    >
                      {!loading ? (isVerificationSent ? "验证" : "索取验证码") : "处理中..."}
                    </button>
                  ) : (
                    <button className={styles.button__main} disabled>
                      Not Allowed
                    </button>
                  )
                ) : (
                  <button className={styles.button__main} disabled>
                    {address === "" ? "输入有效的地址" : "无效的电子邮件地址"}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.content__unauthenticated}>
            {/* Reasoning for Twitter OAuth */}
            {/* Sign in with Twitter */}
          </div>
        )}
      </div>
    </div>


      {/* Faucet details card */}
      <div className={styles.home__card}>
        {/* Card title */}
        <div className={styles.home__card_title}>
          <h3>Faucet Details</h3>
        </div>

        {/* General information */}
        <div>
          <div className={styles.home__card_content_section}>
            <h4>General Information</h4>
            <p>
              Your Twitter account must have at least 1 Tweet, 15 followers, and
              be older than 1 month.
            </p>
            <p className={styles.home__card_content_section_lh}>
              By default, the faucet drips on the Ethereum testnets (Rinkeby,
              Ropsten, Kovan, Görli). You can choose to receive a drip on other
              networks when requesting tokens.
            </p>
            <p>You can claim from the faucet once every 24 hours.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context: any) {
  // Collect session
  const session: any = await getSession(context);

  return {
    props: {
      session,
      // If session exists, collect claim status, else return false
      claimed: session ? await hasClaimed(session.twitter_id) : false,
    },
  };
}
