import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock } from "lucide-react";
import { StoreSettings } from "../types";

interface ContactPageProps {
  settings?: StoreSettings | null;
}

export const ContactPage: React.FC<ContactPageProps> = ({ settings }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Order & Sizing Inquiry");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && message) {
      setSubmitted(true);
    }
  };

  const supportEmail = settings?.supportEmail || "thekartikbusiness@gmail.com";
  const supportPhone = settings?.supportPhone || "+91 9211597397";
  const storeAddress = settings?.storeAddress || "RZ 57, Shyam Vihar, Najafgarh, Delhi 110043";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-2xl mb-10">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
          Client Support & Studio
        </span>
        <h1 className="text-3xl font-black uppercase tracking-wider text-black font-mono mt-1">
          Contact PRYMEWEAR
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-2">
          Have queries about fabric GSM, custom sizing, delivery timelines, or bulk studio inquiries? Our client liaison team is at your service.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-gray-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-black text-white">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-black">
                  Flagship Design Studio
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{storeAddress}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5 pt-4 border-t border-gray-100">
              <div className="p-3 bg-black text-white">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-black">
                  Email Support
                </h3>
                <p className="text-xs text-gray-600 mt-1">{supportEmail}</p>
                <p className="text-[11px] text-gray-400">Response within 2-4 hours</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5 pt-4 border-t border-gray-100">
              <div className="p-3 bg-black text-white">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-black">
                  Direct Line & WhatsApp
                </h3>
                <p className="text-xs text-gray-600 mt-1">{supportPhone}</p>
                <p className="text-[11px] text-gray-400">Mon - Sat, 10:00 AM - 7:00 PM IST</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5 pt-4 border-t border-gray-100">
              <div className="p-3 bg-black text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-black">
                  Operational Timings
                </h3>
                <p className="text-xs text-gray-600 mt-1">Monday – Saturday: 10:00 – 19:00 IST</p>
                <p className="text-[11px] text-gray-400">Sunday: Closed for drop formulation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 bg-white border border-gray-200 p-8 shadow-xs">
          <h2 className="text-base font-black uppercase tracking-wider text-black pb-4 border-b border-gray-100 mb-6">
            Send an Inquiry
          </h2>

          {submitted ? (
            <div className="py-12 text-center space-y-3 bg-emerald-50 border border-emerald-200 p-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-900">
                Inquiry Transmitted Successfully
              </h3>
              <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                Thank you, {name}. A PRYMEWEAR client specialist will reach out to <strong>{email}</strong> shortly.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setMessage("");
                }}
                className="mt-4 px-4 py-2 bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-900"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aryan Malhotra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Subject / Topic
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                >
                  <option value="Order & Sizing Inquiry">Order Status & Sizing Inquiry</option>
                  <option value="Cash on Delivery Question">Cash on Delivery (COD) Questions</option>
                  <option value="Exchange & Return Request">Exchange & Return Request</option>
                  <option value="Brand Partnership & Studio">Brand Partnership & Studio Collaborations</option>
                  <option value="Other">Other Query</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Message Details *
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="How can we assist you?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 text-xs text-black focus:outline-hidden focus:border-black focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
