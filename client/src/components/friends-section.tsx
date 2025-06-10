import { useQuery } from "@tanstack/react-query"
import { Referral, User } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { copyToClipboard } from "@/lib/utils"
import { useTelegram } from "@/hooks/use-telegram"

interface FriendsSectionProps {
  user: User
}

export function FriendsSection({ user }: FriendsSectionProps) {
  const { toast } = useToast()
  const { tg } = useTelegram()

  const { data: referrals } = useQuery<{ referrals: Referral[] }>({
    queryKey: ["/api/referrals", user.id]
  })

  // إنشاء رابط إحالة خاص بتطبيق الويب باستخدام الكود المكون من 6 أرقام/حروف
  const generateWebAppReferralLink = (referralCode: string) => {
    return `https://t.me/Eg_Token_bot/app?startapp=r_${referralCode}`
  }

  const referralLink = generateWebAppReferralLink(user.referralCode)
  const totalInvited = referrals?.referrals.length || 0
  const totalEarned = (referrals?.referrals.length || 0) * 1000
  
  const handleCopyLink = async () => {
    try {
      await copyToClipboard(referralLink)
      toast("تم نسخ رابط الإحالة!")
    } catch (error) {
      toast("فشل نسخ الرابط", "error")
    }
  }

  const handleShareTelegram = () => {
    const shareText = `🎉 انضم إلى بوت ${user.username} عبر الرابط الخاص بي واحصل على مكافأة!
    
استخدم هذا الرابط: ${referralLink}`

    if (tg?.Platform !== "unknown") {
      // استخدام ميزة المشاركة في تليجرام إذا كان داخل التطبيق
      tg.share({
        title: "انضم عبر رابط الدعوة الخاص بي",
        text: shareText,
        url: referralLink
      })
    } else {
      // مشاركة عادية إذا لم يكن في تليجرام
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`
      window.open(telegramUrl, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ادعو أصدقاء 👥</h2>
        <p className="text-gray-600">احصل على 1,000 نقطة لكل صديق يدخل عبر رابطك!</p>
      </div>

      {/* إحصائيات الإحالة */}
      <div className="bg-gradient-to-r from-[#0088CC] to-[#229ED9] text-white rounded-xl p-6">
        <div className="text-center">
          <div className="text-3xl font-bold mb-2">{totalInvited}</div>
          <div className="text-white/80 mb-4">الأصدقاء المدعوين</div>
          <div className="text-2xl font-semibold">{totalEarned.toLocaleString()} نقطة</div>
          <div className="text-white/80 text-sm">إجمالي النقاط من الإحالات</div>
        </div>
      </div>

      {/* كود الدعوة */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h3 className="font-semibold text-gray-800 mb-3">كود الدعوة الخاص بك</h3>
        <div className="flex items-center justify-center bg-gradient-to-r from-[#0088CC] to-[#0066AA] rounded-lg p-4 mb-3">
          <span className="text-2xl font-bold text-white tracking-widest">{user.referralCode}</span>
        </div>
        <p className="text-sm text-gray-600 text-center">شارك هذا الكود مع أصدقائك!</p>
      </div>

      {/* رابط الإحالة */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">رابط الدعوة الخاص بك</h3>
        <div className="flex items-center space-x-2">
          <Input 
            type="text" 
            value={referralLink}
            readOnly 
            className="flex-1 bg-gray-50"
          />
          <Button 
            onClick={handleCopyLink}
            className="bg-[#0088CC] hover:bg-[#0077B3]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </Button>
        </div>
      </div>

      {/* طرق الدعوة */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={handleShareTelegram}
          className="bg-[#0088CC] hover:bg-[#0077B3] p-4 h-auto flex flex-col items-center space-y-2"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          <span className="font-medium">شارك على تليجرام</span>
        </Button>
        
        <Button 
          onClick={handleCopyLink}
          variant="outline"
          className="p-4 h-auto flex flex-col items-center space-y-2 border-gray-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="font-medium">نسخ الرابط</span>
        </Button>
      </div>

      {/* المدعوون حديثاً */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-4">المدعوون حديثاً</h3>
        
        {referrals?.referrals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <p>لا يوجد أصدقاء مدعوين بعد</p>
            <p className="text-sm mt-1">شارك رابطك لبدء كسب النقاط!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals?.referrals.map((referral, index) => (
              <div key={referral.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#0088CC]/10 rounded-full flex items-center justify-center">
                    <span className="text-[#0088CC] font-semibold text-sm">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">صديق #{index + 1}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(referral.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-green-500 font-medium">+{referral.pointsEarned}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}