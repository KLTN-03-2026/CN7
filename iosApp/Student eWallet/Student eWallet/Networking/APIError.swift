//
//  APIError.swift
//  Student eWallet
//
//  Created by Mạc Văn Vinh on 13/4/26.
//

import Foundation

enum APIError: Error {
    case invalidURL
    case noData
    case decodingError
    case serverError
}
