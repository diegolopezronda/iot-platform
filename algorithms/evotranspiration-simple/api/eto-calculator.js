EToCalculator = function() {};
EToCalculator.prototype = {
  /*
  STEP 1
  Mean daily temperature

  The (average) daily maximum and minimum air
  temperatures in degrees Celsius (°C) are required. Where
  only (average) mean daily temperatures are available, the
  calculations can still be executed but some underestimation
  of ETo
   will probably occur due to the non-linearity of the
  saturation vapor pressure - temperature relationship (Allen
  et al. 1998). Average temperature is calculated by:
  */
  T: function(min, max) {
    return (max + min) / 2;
  },
  /*
  STEP 2
  Mean daily solar radiation (Rs)

  The average daily net radiation expressed in megajoules per
  square meter per day (MJ m-2 day-1) is required. A simple
  average of solar radiation values obtained from a weather
  station in the period of 24h (0:00:01 am to 11:59:59 pm) is
  required. The conversion of units may be required when
  solar radiation is expressed in watts per square meter per
  day (W m-2 day-1).
  */
  Rs_MJ: function(Rs_W) {
    return Rs_W * 0.0864;
  },
  /***
  STEP 3
  Wind speed (u2)

  The average daily wind speed in meters per second (m
  s-1) measured at 2 m above the ground level is required.
  It is important to verify the height at which wind speed is
  measured, as wind speeds measured at different heights
  above the soil surface differ. The wind speed measured at
  heights other than 2 m can be adjusted according to the
  follow equation:
  ***/
  U2: function(U, H) {
    return U * (4.87 / Math.log(67.8 * H - 5.42));
  },
  /***
  STEP 4
  Slope of saturation vapor pressure curve (Δ)

  For the calculation of evapotranspiration, the slope of
  the relationship between saturation vapor pressure and
  temperature, Δ, is required.
  ***/
  D: function(T) {
    var A = T + 237.3;
    return (4098 * (0.6108 * Math.E * (17.27 * T / A))) / Math.pow(A, 2);
  },
  /*
  STEP 5
  Atmospheric Pressure (P)

  The atmospheric pressure, P, is the pressure exerted by
  the weight of the earth’s atmosphere. Evaporation at high
  altitudes is promoted due to low atmospheric pressure. This
  effect is, however, small and in the calculation procedures,
  the average value for a location is sufficient. A simplification
  of the ideal gas law, assuming 20°C for a standard atmosphere,
  can be employed to calculate P in kPa at a particular
  elevation:
  */
  P: function(z) {
    return 101.3 * Math.pow((293 - 0.0065 * z) / 293, 5.26);
  },
  /***
  STEP 6
  Psychrometric constant (γ)

  The psychrometric constant relates the partial pressure of
  water in air to the air temperature so that vapor pressure
  can be estimated using paired dry and wet thermometer
  bulb temperature readings. Another way to describe the
  psychrometric constant is the ratio of specific heat of moist
  air at constant pressure (Cp
  ) to latent heat of vaporization.
  The specific heat at constant pressure is the amount of
  energy required to increase the temperature of a unit mass
  of air by one degree at constant pressure. Its value depends
  on the composition of the air, i.e., on its humidity. For
  average atmospheric conditions a Cp
   value of 1.013 10-3 MJ
  kg-1 °C-1 can be used. As an average atmospheric pressure is
  used for each location, the psychrometric constant is kept
  constant for each location depending of the altitude [Eq.
  10].
  ***/
  y: function(P) {
    return 0.000665 * P;
  },
  /*
  STEP 7
  Delta Term (DT) (auxiliary calculation for Wind Term)

  In order to simplify the ETo calculation, several terms are
  calculated separated. The delta term is used to calculate the
  Radiation Term of the overall ETo equation
  */
  DT: function(y, D, U2) {
    return D / (D + y * (1 + 0.34 * U2));
  },
  /*
  STEP 8
  Psi Term (PT) (auxiliary calculation for Wind Term)

  The psi term is used to calculate the Wind Term of the
  overall ETo
  */
  PT: function(y, D, U2) {
    return y / (D + y * (1 + 0.34 * U2));
  },
  /*
  STEP 9
  Temperature Term (TT) (auxiliary calculation for Wind Term)

  The temperature term is used to calculate the Wind Term of
  the overall ETo
  */
  TT: function(T_mean, U2) {
    return (900 / (T_mean + 273)) * U2
  },
  /*
  STEP 10
  Mean saturation vapor pressure derived from air temperature(es)

  As saturation vapor pressure is related to air temperature, it
  can be calculated from the air temperature. The relationship
  is expressed by:
  */
  Et: function(T) {
    return 0.6108 * Math.pow(Math.E, 17.27 * T / (T + 237.3));
  },

  Es: function(min, max) {
    return (this.Et(min) + this.Et(max)) / 2;
  },
  /*
  STEP 11
  Actual vapor pressure (ea) derived from relative humidity

  The actual vapor pressure can also be calculated from the
  relative humidity. Depending on the availability of the
  humidity data, different equations should be used.
  */
  Ea: function(E_tmin, E_tmax, RH_min, RH_max, RH_mean) {
    if (undefined === RH_min || RH_min === null) {
      if (undefined === RH_max || RH_max === null) {
        if (undefined === RH_mean || RH_mean === null) {
          return E_tmin;
        }
        return (RH_mean / 100) * ((E_tmin + E_tmax) / 2);
      }
      return E_tmin * (RH_max / 100);
    }
    return (E_tmin * (RH_max / 100) + E_tmax * (RH_min / 100)) / 2;
  },
  /*
  STEP 12
  The inverse relative distance Earth-Sun (dr) and
  solar declination (d)
  The inverse relative distance Earth-Sun, dr, and the solar
  declination, d, are given by:
  */
  Dr: function(J) {
    return 1 + 0.033 * Math.cos((2 * Math.PI / 365) * J);
  },

  d: function(J) {
    return 0.409 * Math.sin((2 * Math.PI / 365) * J - 1.39);
  },
  /*
  STEP 13
  Conversion of latitude (φ) in degrees to radians

  The latitude, φ, expressed in radians is positive for the
  northern hemisphere and negative for the southern hemisphere
  (see example below). The conversion from decimal
  degrees to radians is given by:
  */
  phi: function(deg) {
    return deg * Math.PI / 180;
  },
  /*
  STEP 14
  Sunset hour angle (ωs)

  The sunset hour angle (…s) is given by:
  */
  Ws: function(phi, d) {
    return Math.acos(-Math.tan(phi) * Math.tan(d));
  },
  /*
  STEP 15
  Extraterrestrial radiation (Ra)

  The extraterrestrial radiation, Ra
  , for each day of the year
  and for different latitudes can be estimated from the solar
  constant, the solar declination and the time of the year by:
  */
  Ra: function(Ws, phi, d, Dr) {
    var Gsc = 0.0820;
    return (24 * 60 / Math.PI) *
      Gsc *
      Dr *
      (Ws * Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.sin(Ws));
  },
  /*
  STEP 16
  Clear sky solar radiation (Rso)

  The calculation of the clear-sky radiation is given by:
  */
  Rso: function(z, Ra) {
    return (0.75 + 2 * Math.E * Math.pow(10, -5) * z) * Ra;
  },
  /*
  STEP 17
  Net solar or net shortwave radiation (Rns)

  The net shortwave radiation resulting from the balance
  between incoming and reflected solar radiation is given by:
  */
  Rns: function(Rs) {
    var a = 0.23;
    return (1 - a) * Rs;
  },
  /*
  STEP 18
  Net outgoing long wave solar radiation (Rnl)

  The rate of longwave energy emission is proportional
  to the absolute temperature of the surface raised to the
  fourth power. This relation is expressed quantitatively by
  the Stefan-Boltzmann law. The net energy flux leaving the
  earth’s surface is, however, less than that emitted and given
  by the Stefan-Boltzmann law due to the absorption and
  downward radiation from the sky. Water vapor, clouds,
  carbon dioxide, and dust are absorbers and emitters of
  longwave radiation. It is thereby assumed that the concentrations
  of the other absorbers are constant:
  */
  Rnl: function(Tmin, Tmax, Ea, Rs, Rso) {
    var o = 4.903 * Math.pow(10, -9);
    return o * (
      (Math.pow(Tmax + 273.16, 4) + Math.pow(Tmin + 273.16, 4)) / 2
    ) * (
      0.34 - 0.14 * Math.sqrt(Ea)
    ) * (
      1.35 * (Rs / Rso) - 0.35
    );
  },
  /*
  STEP 19
  Net radiation (Rn)

  The net radiation (Rn
  ) is the difference between the incoming
  net shortwave radiation (Rns) and the outgoing net
  longwave radiation (Rnl):
  */
  Rn: function(Rns, Rnl) {
    return Rns - Rnl;
  },

  ETo: function(D, Rn, G, y, T, U2, Es, Ea) {
    return (
      0.408 * D * (Rn - G) +
      y * (900 / (T + 273)) * U2 * (Es - Ea)
    ) / (
      D + y * (1 + 0.34 * U2)
    );
  },


  calculate: function(t_max, t_min, RH_max, RH_min, Rs, U2, P, Z, J, LAT) {
    var T = this.T(t_min, t_max);
    var D = this.D(T);
    P = (undefined === P || P === null) ? this.P(Z) : P;
    var y = this.y(P);
    var Es = this.Es(t_min, t_max);

    var E_tmin = this.Et(t_min);
    var E_tmax = this.Et(t_max);
    var Ea = this.Ea(E_tmin, E_tmax, RH_min, RH_max, null);

    var d = this.d(J);
    var Dr = this.Dr(J);
    var phi = this.phi(LAT);
    var Ws = this.Ws(phi, d);
    var Ra = this.Ra(Ws, phi, d, Dr);
    var Rso = this.Rso(Z, Ra);
    var Rns = this.Rns(Rs);
    var Rnl = this.Rnl(t_min, t_max, Ea, Rs, Rso);
    var Rn = this.Rn(Rns, Rnl);

    var DT = this.DT(y, D, U2);
    var PT = this.PT(y, D, U2);
    var TT = this.TT(T, U2);
    var Rng = Rn * 0.408;
    var ET_rad = DT * Rng;
    var ET_wind = PT * TT * (Es - Ea);
    var ETo = ET_rad + ET_wind;
    return ETo;
  }
};

module.exports = new EToCalculator();
